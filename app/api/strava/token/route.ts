import { NextResponse } from "next/server";
import supabase from "@/utils/supabaseClient";

export async function POST(req: Request) {
  try {
    const { user_id, refresh_token } = await req.json();

    if (!user_id || !refresh_token) {
      return NextResponse.json(
        { error: "Missing user_id or refresh_token" },
        { status: 400 }
      );
    }

    // 🔄 Request new tokens from Strava
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("❌ Strava refresh error:", tokenData);
      return NextResponse.json(
        { error: "Strava refresh failed", details: tokenData },
        { status: 500 }
      );
    }

    console.log("✅ Strava refreshed tokens:", tokenData);

    // ⏫ Update in Supabase
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      })
      .eq("user_id", user_id);

    if (dbError) {
      console.error("❌ Supabase update error:", dbError);
      return NextResponse.json(
        { error: "Failed to update tokens in DB", details: dbError },
        { status: 500 }
      );
    }

    // ✅ Return new tokens so frontend can use immediately
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error refreshing token:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err.message },
      { status: 500 }
    );
  }
}
