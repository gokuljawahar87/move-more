import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Access user_id from cookies
  const user_id = req.cookies.get("user_id")?.value;

  // Paths that don’t need protection
  const publicPaths = ["/register", "/api", "/favicon.ico", "/_next"];
  if (publicPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
    return res;
  }

  // If no user_id → force to register
  if (!user_id) {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  // Check profile in Supabase
  const supabase = createClient(req, res);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("team, access_token")
    .eq("user_id", user_id)
    .single();

  if (error || !profile) {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  // If registered but no Strava connected → stay on dashboard
  if (!profile.access_token && req.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// Run middleware on these routes
export const config = {
  matcher: ["/app/:path*", "/dashboard", "/register"],
};
