import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, SESSION_COOKIE, sessionToken } from "@/lib/auth";

// Everything except /login requires the session cookie. With no APP_PASSWORD
// set (local dev), auth is disabled entirely.
export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken())) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Skip Next internals and static assets (icons, manifest) so the login
  // page and installed-PWA chrome load unauthenticated.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|icon-192\\.png|icon-512\\.png|apple-icon\\.png).*)",
  ],
};
