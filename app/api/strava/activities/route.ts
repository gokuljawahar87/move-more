// app/api/strava/activities/route.ts
import { NextResponse } from "next/server";
import supabase from "@/utils/supabaseClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("access_token")
      .eq("user_id", user_id)
      .single();

    if (error || !profile?.access_token) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    // Call Strava
    const res = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=5", {
      headers: { Authorization: `Bearer ${profile.access_token}` },
    });

    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    if (!res.ok) {
      // pass through status and body so client can decide
      return NextResponse.json({ error: "Strava API error", status: res.status, body }, { status: res.status });
    }

    return NextResponse.json(body);
  } catch (err) {
    console.error("Activities route error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
