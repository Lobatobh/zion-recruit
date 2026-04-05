import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = [
  "/api/auth",
  "/api/public",
  "/api/portal",
  "/api/billing/webhook",
  "/api/health",
  "/_next",
  "/favicon",
  "/robots",
  "/logo.svg",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and images
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/images")) {
    return NextResponse.next();
  }

  // API routes: check for JWT token
  if (pathname.startsWith("/api/")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "zion-recruit-secret-key-change-in-production",
    });

    if (!token) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Add tenant header for downstream processing
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", (token.tenantId as string) || "");
    requestHeaders.set("x-user-id", (token.id as string) || "");

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
