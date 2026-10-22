import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { buildRegistrationEmail } from "@/lib/auth/registration-email";
import { isSupportedCountry } from "@/lib/community/countries";
import {
  buildAuthCallbackUrl,
  DEFAULT_POST_REGISTER_PATH,
  normalizeAuthNextPath,
} from "@/lib/supabase/auth-redirect";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const REGISTER_WINDOW_SECONDS = 15 * 60;
const MAX_REGISTRATIONS_PER_EMAIL = 3;
const MAX_REGISTRATIONS_PER_IP = 10;

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(256),
  country: z.custom<string>(isSupportedCountry),
  locale: z.enum(["fr", "he"]).default("fr"),
  nextPath: z.string().optional(),
});

type RedisResult = { result?: number; error?: string };
type LocalRateLimitEntry = { count: number; expiresAt: number };

const localRateLimits = new Map<string, LocalRateLimitEntry>();

function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.NODE_ENV === "development" || url.hostname === "localhost") {
    return url.origin;
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (siteUrl) return siteUrl;
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
}

function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitKey(scope: "email" | "ip", value: string): string {
  const digest = createHash("sha256").update(value).digest("hex");
  return `auth:register:${scope}:${digest}`;
}

async function incrementRateLimit(key: string): Promise<number> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    return incrementLocalRateLimit(key);
  }

  const script = [
    "local count = redis.call('INCR', KEYS[1])",
    "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
    "return count",
  ].join("; ");
  let response: Response;
  try {
    response = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        script,
        1,
        key,
        REGISTER_WINDOW_SECONDS,
      ]),
      cache: "no-store",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Auth] Redis unavailable; using local development rate limit");
      return incrementLocalRateLimit(key);
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Registration rate limiter failed (${response.status})`);
  }

  const payload = (await response.json()) as RedisResult;
  if (payload.error || typeof payload.result !== "number") {
    throw new Error(payload.error ?? "Invalid registration rate limiter response");
  }
  return payload.result;
}

function incrementLocalRateLimit(key: string): number {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Registration rate limiter is not configured");
  }

  const now = Date.now();
  const current = localRateLimits.get(key);
  if (!current || current.expiresAt <= now) {
    localRateLimits.set(key, {
      count: 1,
      expiresAt: now + REGISTER_WINDOW_SECONDS * 1000,
    });
    return 1;
  }
  current.count += 1;
  return current.count;
}

async function isRateLimited(request: Request, email: string): Promise<boolean> {
  const [emailCount, ipCount] = await Promise.all([
    incrementRateLimit(rateLimitKey("email", email)),
    incrementRateLimit(rateLimitKey("ip", requestIp(request))),
  ]);
  return (
    emailCount > MAX_REGISTRATIONS_PER_EMAIL ||
    ipCount > MAX_REGISTRATIONS_PER_IP
  );
}

function isExistingUserError(error: { code?: string; message: string }): boolean {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered|already exists/i.test(error.message)
  );
}

function buildConfirmationUrl(
  origin: string,
  nextPath: string,
  tokenHash: string,
  type: string,
): string {
  const confirmationUrl = new URL("/auth/callback", origin);
  confirmationUrl.searchParams.set("token_hash", tokenHash);
  confirmationUrl.searchParams.set("type", type);
  confirmationUrl.searchParams.set("next", nextPath);
  return confirmationUrl.toString();
}

export async function POST(request: Request) {
  let input: z.infer<typeof registrationSchema>;
  try {
    input = registrationSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
  }

  try {
    if (await isRateLimited(request, input.email)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  } catch (error) {
    console.error("[Auth] Registration rate limiter unavailable:", error);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const origin = requestOrigin(request);
  const nextPath = normalizeAuthNextPath(
    input.nextPath,
    DEFAULT_POST_REGISTER_PATH,
  );
  const redirectTo = buildAuthCallbackUrl(
    origin,
    nextPath,
    DEFAULT_POST_REGISTER_PATH,
  );
  const admin = createAdminClient();
  let createdUserId: string | null = null;
  let actionLink: string | null = null;

  const signupResult = await admin.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.name, country: input.country },
      redirectTo,
    },
  });

  if (!signupResult.error && signupResult.data.properties) {
    createdUserId = signupResult.data.user.id;
    actionLink = buildConfirmationUrl(
      origin,
      nextPath,
      signupResult.data.properties.hashed_token,
      signupResult.data.properties.verification_type,
    );
  } else if (signupResult.error && isExistingUserError(signupResult.error)) {
    const retryResult = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: input.email,
      options: { redirectTo },
    });
    if (!retryResult.error && retryResult.data.properties) {
      actionLink = buildConfirmationUrl(
        origin,
        nextPath,
        retryResult.data.properties.hashed_token,
        retryResult.data.properties.verification_type,
      );
    }
  }

  if (!actionLink) {
    console.error("[Auth] Unable to generate registration link:", signupResult.error);
    return NextResponse.json({ error: "registration_failed" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.AUTH_EMAIL_FROM ?? "EasyCom IA <noreply@easycom-ai.com>";
  if (!apiKey) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    console.error("[Auth] RESEND_API_KEY is missing");
    return NextResponse.json({ error: "email_delivery_failed" }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const email = buildRegistrationEmail(actionLink, input.locale);
  const { error: emailError } = await resend.emails.send({
    from,
    to: [input.email],
    subject: email.subject,
    html: email.html,
  });

  if (emailError) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    console.error("[Auth] Confirmation email delivery failed:", emailError);
    return NextResponse.json({ error: "email_delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
