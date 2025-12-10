import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
    const token = request.cookies.get("token")?.value;
    const { pathname } = request.nextUrl;

    const redirectToLogin = () => {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        const res = NextResponse.redirect(url);
        res.cookies.delete("token");
        return res;
    };

    // Public paths that don't require auth
    const publicPaths = ["/login", "/api/auth/login", "/api/auth/register", "/api/seed", "/api/auth/me"];
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    // Basic token check
    if (!token && !isPublicPath) {
        return redirectToLogin();
    }
    if (token && token.split(".").length !== 3) {
        return redirectToLogin();
    }

    // Redirect authenticated users away from login
    if (token && pathname === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // Admin check
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        if (!token) {
            return redirectToLogin();
        }

        try {
            const secret = new TextEncoder().encode(
                process.env.JWT_SECRET || "dev-secret-key"
            );
            const { payload } = await jwtVerify(token, secret);

            if (payload.role !== "SYSTEM_ADMIN") {
                const url = request.nextUrl.clone();
                url.pathname = "/";
                return NextResponse.redirect(url);
            }
        } catch (error) {
            console.warn("Proxy Auth Error:", error instanceof Error ? error.message : error);
            return redirectToLogin();
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};

export default proxy;
