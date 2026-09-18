import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("cr_session")?.value;
  const signedIn = token !== undefined && token.length > 0;

  if (
    !signedIn &&
    (pathname.startsWith("/projects") || pathname.startsWith("/review") || pathname.startsWith("/snapshot"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (signedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*", "/review/:path*", "/snapshot/:path*", "/login", "/register", "/invite/:path*"],
};
