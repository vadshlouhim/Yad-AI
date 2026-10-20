import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { normalizeAuthNextPath } from "../src/lib/supabase/auth-redirect";
import { detectLocaleFromRequest, detectVisitorLocale } from "../src/lib/locale-detection";
import { isDashboardPathEnabled, isFeatureEnabled } from "../src/lib/features-by-locale";

// Execute the real proxy with isolated dependencies: no network or real sessions.
const source = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const nativeRequire = createRequire(import.meta.url);
let configured = true;
let calls = 0;
let user: { id: string } | null = null;
let unavailable = false;
let sessionResponse = NextResponse.next();
const moduleExports: {
  proxy?: (request: NextRequest) => Promise<NextResponse>;
  config?: { matcher: string[] };
} = {};
runInNewContext(compiled, {
  exports: moduleExports,
  require(name: string) {
    if (name === "@/lib/supabase/auth-redirect") return { normalizeAuthNextPath };
    if (name === "@/i18n/config") return {
      isSupportedLocale: (value: unknown) => value === "fr" || value === "he",
      LOCALE_COOKIE_MAX_AGE: 60 * 60 * 24 * 365,
      LOCALE_COOKIE_NAME: "NEXT_LOCALE",
      LOCALE_SOURCE_AUTO: "auto",
      LOCALE_SOURCE_COOKIE_NAME: "locale_source",
    };
    if (name === "@/lib/locale-detection") return { detectLocaleFromRequest };
    if (name === "@/lib/supabase/config") return { isSupabaseConfigured: () => configured };
    if (name === "@/lib/supabase/session") return {
      updateSession: async () => {
        calls++;
        if (unavailable) throw new Error("Simulated Supabase Auth outage");
        return { user, supabaseResponse: sessionResponse };
      },
    };
    if (name === "@/lib/demo/access") return {
      DEMO_ACCESS_COOKIE: "demo-access",
      isValidDemoAccessCookie: (value: string) => value === "valid",
    };
    return nativeRequire(name);
  },
  URL,
  Headers,
  process,
});
assert.ok(moduleExports.proxy);
const proxy = moduleExports.proxy;
function request(path: string, cookie?: string, headers?: Record<string, string>) {
  return new NextRequest(`https://example.test${path}`, {
    headers: { ...(cookie ? { cookie } : {}), ...headers },
  });
}
function reset() {
  configured = true;
  calls = 0;
  user = null;
  unavailable = false;
  sessionResponse = NextResponse.next();
}

async function main() {
  for (const [path, headers, expected] of [
    ["/?country=IL", {}, "he"],
    ["/?country=FR", {}, "fr"],
    ["/?country=US", {}, "fr"],
    ["/?country=FR", { "accept-language": "he-IL,fr;q=0.8" }, "he"],
  ] as const) {
    reset();
    const response = await proxy(request(path, undefined, headers));
    assert.equal(response.cookies.get("NEXT_LOCALE")?.value, expected, path);
    assert.equal(response.cookies.get("locale_source")?.value, "auto", path);
  }
  reset();
  const manual = await proxy(request("/?country=IL", "NEXT_LOCALE=fr; locale_source=manual"));
  assert.equal(manual.cookies.get("NEXT_LOCALE"), undefined, "manual locale must never be overwritten");
  reset();
  const connected = await proxy(request("/", "sb-test-auth-token=existing-session", { "x-vercel-ip-country": "IL" }));
  assert.equal(connected.cookies.get("NEXT_LOCALE"), undefined, "profile locale must take priority for connected users");
  assert.equal(detectVisitorLocale({ acceptLanguage: "he-IL,fr;q=0.8", country: "FR", userAgent: "Mozilla/5.0" }), "he");
  assert.equal(detectVisitorLocale({ acceptLanguage: "en-US", country: "IL", userAgent: "Googlebot" }), "fr");
  assert.equal(isFeatureEnabled("he", "newsletter"), true);
  assert.equal(isFeatureEnabled("he", "publish"), false);
  assert.equal(isDashboardPathEnabled("he", "/dashboard/newsletter"), true);
  assert.equal(isDashboardPathEnabled("he", "/dashboard/settings/billing"), true);
  assert.equal(isDashboardPathEnabled("he", "/dashboard/templates"), false);
  assert.equal(isDashboardPathEnabled("fr", "/dashboard/templates"), true);

  const publicPaths = [
    "/", "/method", "/affiches", "/contact", "/blog", "/tarification",
    "/privacy", "/data-deletion", "/help", "/site-map", "/sitemap.xml",
    "/robots.txt", "/llms.txt", "/agents", "/legal", "/communication",
    "/auth/forgot-password", "/auth/reset-password", "/auth/callback?code=example",
    "/auth/error", "/dashboard/email/oauth-done", "/dashboard/google-reviews/oauth-done",
    "/googleabc123.html", "/blog/article", "/agents/agent", "/legal/terms",
    "/auth/login/nested", "/auth/register/nested",
  ];
  for (const path of publicPaths) {
    for (const cookie of [undefined, "sb-test-auth-token=existing-session"]) {
      reset();
      unavailable = true;
      const response = await proxy(request(path, cookie));
      assert.equal(response.headers.get("x-middleware-next"), "1", path);
      assert.equal(calls, 0, `${path} must not call Auth, even with cookies`);
    }
  }
  for (const path of ["/auth/login", "/auth/register", "/dashboard", "/admin", "/onboarding"]) {
    reset();
    unavailable = true;
    await assert.rejects(() => proxy(request(path)), /Simulated Supabase Auth outage/);
    assert.equal(calls, 1, `${path} must retain identity verification`);
  }
  for (const path of ["/auth/login", "/auth/register"]) {
    reset();
    assert.equal(await proxy(request(path)), sessionResponse);
    assert.equal(calls, 1);
    for (const destination of ["/dashboard", "/dashboard/settings"]) {
      reset();
      user = { id: "verified-user" };
      // Model the response returned after Supabase renews an expired session.
      sessionResponse.cookies.set("sb-token.0", "renewed", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
      sessionResponse.cookies.set("sb-token.1", "second-chunk", { path: "/" });
      sessionResponse.headers.set("cache-control", "private, no-store");
      sessionResponse.headers.set("expires", "0");
      sessionResponse.headers.set("pragma", "no-cache");
      const suffix = destination === "/dashboard" ? "" : `?callbackUrl=${encodeURIComponent(destination)}`;
      const response = await proxy(request(path + suffix, "sb-test-auth-token=expired"));
      assert.equal(response.headers.get("location"), `https://example.test${destination}`);
      assert.deepEqual(response.cookies.getAll(), sessionResponse.cookies.getAll());
      for (const header of ["cache-control", "expires", "pragma"]) {
        assert.equal(response.headers.get(header), sessionResponse.headers.get(header));
      }
      assert.equal(calls, 1);
    }
    for (const invalid of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test"]) {
      reset();
      user = { id: "verified-user" };
      const response = await proxy(request(`${path}?callbackUrl=${encodeURIComponent(invalid)}`));
      assert.equal(response.headers.get("location"), "https://example.test/dashboard");
    }
  }
  for (const path of ["/dashboard", "/admin", "/onboarding", "/unknown", "/method-private", "/api", "/cookies"]) {
    reset();
    sessionResponse.cookies.set("sb-token", "cleared", { maxAge: 0, path: "/" });
    sessionResponse.headers.set("cache-control", "no-store");
    const response = await proxy(request(path, "sb-test-auth-token=unverified"));
    const location = new URL(response.headers.get("location")!);
    assert.equal(location.pathname, "/auth/login", path);
    assert.equal(location.searchParams.get("callbackUrl"), path);
    assert.deepEqual(response.cookies.getAll(), sessionResponse.cookies.getAll());
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(calls, 1);
    user = { id: "verified-user" };
    assert.equal(await proxy(request(path)), sessionResponse);
    reset();
    configured = false;
    assert.equal(new URL((await proxy(request(path))).headers.get("location")!).pathname, "/auth/login");
    assert.equal(calls, 0);
  }
  for (const path of ["/api/auth/callback", "/api/webhooks/stripe", "/api/cron", "/demo-access/secret"]) {
    reset();
    unavailable = true;
    const response = await proxy(request(path));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(calls, 0);
    if (path.startsWith("/demo-access/")) {
      assert.equal(response.headers.get("cache-control"), "no-store, private");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
    }
  }
  reset();
  unavailable = true;
  assert.equal((await proxy(request("/demo/dashboard"))).status, 404);
  assert.equal((await proxy(request("/demo/dashboard", "demo-access=invalid"))).status, 404);
  const demo = await proxy(request("/demo/dashboard", "demo-access=valid"));
  assert.equal(demo.headers.get("x-middleware-next"), "1");
  assert.equal(demo.headers.get("cache-control"), "no-store, private");
  assert.equal(demo.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(calls, 0);
  for (const path of ["/", "/auth/login", "/auth/register"]) {
    reset();
    configured = false;
    assert.equal((await proxy(request(path))).headers.get("x-middleware-next"), "1");
    assert.equal(calls, 0);
  }
  const matcher = new RegExp(`^${moduleExports.config?.matcher[0]}$`);
  for (const asset of ["/media/home/easycom-demo-master.mp4", "/media/home/02-dovber-publier-partout.mp4", "/media/home/demo-mobile.webp"]) {
    assert.equal(matcher.test(asset), false, `Public home asset must bypass the session proxy: ${asset}`);
  }
  for (const privatePath of ["/dashboard", "/dashboard/boutique", "/dashboard/private.mp4", "/media/private.mp4", "/media/home-private/file.mp4"]) {
    assert.equal(matcher.test(privatePath), true, `Private route must keep session protection: ${privatePath}`);
  }
  console.log("Proxy regression tests passed (public outage, auth redirects, cookies, private routes, OAuth, demos, APIs, matcher).");
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
