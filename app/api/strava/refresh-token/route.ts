import { NextResponse } from "next/server";
import supabase from "@/utils/supabaseClient";

export async function POST(req: Request) {
  const { user_id } = await req.json();

  try {
    // Get stored refresh_token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("strava_refresh_token")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile?.strava_refresh_token) {
      return NextResponse.json({ error: "No refresh_token found for user" }, { status: 400 });
    }

    // Call Strava refresh endpoint
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: profile.strava_refresh_token,
      }),
    });

    const tokenData = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: tokenData }, { status: res.status });
    }

    // Save new tokens
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: "Failed to update tokens" }, { status: 500 });
    }

    return NextResponse.json({ success: true, access_token: tokenData.access_token });
  } catch (err) {
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
