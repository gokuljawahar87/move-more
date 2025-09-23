import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    // 1. Exchange code for token from Strava
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: tokenData },
        { status: tokenResponse.status }
      );
    }

    const { access_token, refresh_token, athlete } = tokenData;

    // 2. Get employee ID from cookie
    const cookieStore = cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json(
        { error: "No employee session found" },
        { status: 401 }
      );
    }

    // 3. Update existing profile with Strava ID and tokens
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        strava_id: `strava:${athlete.id}`,
        access_token,
        refresh_token,
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating profile:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // 4. Redirect back to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`);
  } catch (err: any) {
    console.error("Callback error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
