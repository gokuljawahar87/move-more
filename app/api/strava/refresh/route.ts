// app/api/strava/refresh/route.ts
import { NextResponse } from "next/server";
import supabase from "@/utils/supabaseClient"; // make sure alias @/utils exists

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user_id = body?.user_id;

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // load refresh_token from DB
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("refresh_token")
      .eq("user_id", user_id)
      .single();

    if (error || !profile?.refresh_token) {
      return NextResponse.json({ error: "No refresh_token found for user" }, { status: 404 });
    }

    // call strava token endpoint to refresh
    const stravaRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: profile.refresh_token,
      }),
    });

    const stravaBodyText = await stravaRes.text();
    let stravaBody;
    try {
      stravaBody = JSON.parse(stravaBodyText);
    } catch {
      stravaBody = stravaBodyText;
    }

    if (!stravaRes.ok) {
      return NextResponse.json(
        { error: "Strava refresh failed", status: stravaRes.status, body: stravaBody },
        { status: 502 }
      );
    }

    // Strava returns expires_at as epoch seconds (number). Save it as a number to DB.
    const access_token = stravaBody.access_token;
    const refresh_token = stravaBody.refresh_token;
    const expires_at = Number(stravaBody.expires_at) || Math.floor(Date.now() / 1000) + Number(stravaBody.expires_in || 21600);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        access_token,
        refresh_token,
        token_expires_at: expires_at, // store epoch seconds (BIGINT / integer in DB)
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: "Failed to save refreshed token", details: updateError }, { status: 500 });
    }

    return NextResponse.json({ message: "Token refreshed", tokens: { access_token, refresh_token, expires_at } });
  } catch (err) {
    console.error("Refresh endpoint error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
