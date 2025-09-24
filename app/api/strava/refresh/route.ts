import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("refresh_token")
      .eq("user_id", user_id)
      .single();

    if (fetchError || !profile?.refresh_token) {
      return NextResponse.json({ error: "No refresh token found" }, { status: 400 });
    }

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: profile.refresh_token,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.errors) {
      return NextResponse.json({ error: tokenData.errors }, { status: 400 });
    }

    await supabase
      .from("profiles")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      })
      .eq("user_id", user_id);

    return NextResponse.json(tokenData);
  } catch (err) {
    console.error("Refresh token error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
