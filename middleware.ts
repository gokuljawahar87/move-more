import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // get user_id cookie
  const userId = req.cookies.get("user_id")?.value;

  // if no cookie → always go to /register
  if (!userId && !url.pathname.startsWith("/register")) {
    url.pathname = "/register";
    return NextResponse.redirect(url);
  }

  // if user exists
  if (userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("access_token")
      .eq("user_id", userId)
      .single();

    // no profile in DB → send to register
    if (!profile && !url.pathname.startsWith("/register")) {
      url.pathname = "/register";
      return NextResponse.redirect(url);
    }

    // profile exists but no Strava token → send to dashboard
    if (profile && !profile.access_token && url.pathname !== "/dashboard") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // profile exists and Strava connected → allow /app
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/dashboard"],
};
