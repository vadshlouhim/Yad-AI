import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_ACCESS_COOKIE_MAX_AGE,
  demoAccessCookieValue,
  isValidDemoAccessToken,
} from "@/lib/demo/access";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function notFound() {
  return new NextResponse("Not Found", { status: 404, headers: PRIVATE_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token);

  if (!isValidDemoAccessToken(decodedToken)) return notFound();

  const requestedDestination = request.nextUrl.searchParams.get("next");
  const destination = requestedDestination?.startsWith("/demo/")
    ? requestedDestination
    : "/demo";
  const response = NextResponse.redirect(new URL(destination, request.url));
  Object.entries(PRIVATE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
  response.cookies.set(DEMO_ACCESS_COOKIE, demoAccessCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/demo",
    maxAge: DEMO_ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
