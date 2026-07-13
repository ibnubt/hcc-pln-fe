import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const authed = req.cookies.get(AUTH_COOKIE)?.value === "1";
  const isLogin = req.nextUrl.pathname === "/login";

  if (!authed && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (authed && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // proteksi semua route kecuali API, aset statis & _next
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
