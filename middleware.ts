// Middleware: protect app routes, redirect to login if not authenticated

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths that don't need authentication
  const publicPaths = ["/login", "/api/auth/login", "/api/mcp"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip Next.js internal paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const res = NextResponse.next();

  // For API routes, return 401
  if (pathname.startsWith("/api/")) {
    // Session checking happens in route handlers via requireSession()
    return res;
  }

  // For page routes, check session and redirect if not logged in
  const session = await getIronSession<SessionData>(req.cookies as any, sessionOptions);

  if (!session.isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

