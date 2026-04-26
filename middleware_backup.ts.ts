import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ✅ allow these routes freely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/" ||
    pathname === "/auth"
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

// 👇 ADD MATCHER HERE (OUTSIDE FUNCTION)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}