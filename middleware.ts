// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl.clone();

  if (user) {
    // Check if profile exists in Supabase
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // No profile yet → force them to register
    if (!profile || error) {
      if (!url.pathname.startsWith("/register")) {
        url.pathname = "/register";
        return NextResponse.redirect(url);
      }
    }

    // Profile exists → force them into /app (unless they’re already there)
    else {
      if (
        url.pathname === "/" ||
        url.pathname.startsWith("/register") ||
        url.pathname === "/dashboard"
      ) {
        url.pathname = "/app";
        return NextResponse.redirect(url);
      }
    }
  }

  return res;
}

// Only run middleware on these routes
export const config = {
  matcher: ["/", "/register", "/app/:path*", "/dashboard"],
};
