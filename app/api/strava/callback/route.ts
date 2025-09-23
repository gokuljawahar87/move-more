import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Authorization code missing" }, { status: 400 });
  }

  const cookieStore = cookies();
  const user_id = cookieStore.get("user_id")?.value;

  if (!user_id) {
    return NextResponse.json({ error: "No user session found" }, { status: 401 });
  }

  try {
    // Exchange code for access token
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
      console.error("Strava token error:", tokenData);
      return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
    }

    const supabase = createClient();

    // Store Strava tokens
    await supabase.from("profiles").update({
      strava_user_id: tokenData.athlete.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_at,
    }).eq("user_id", user_id);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`);
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
