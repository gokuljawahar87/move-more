import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ error: "User not logged in" }, { status: 401 });
    }

    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      response_type: "code",
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback`,
      approval_prompt: "force",
      scope: "read,activity:read_all",
      state: user_id, // ✅ attach user_id here
    });

    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(stravaAuthUrl);
  } catch (err: any) {
    console.error("Strava connect error:", err);
    return NextResponse.json({ error: "Failed to build Strava auth URL", details: err.message }, { status: 500 });
  }
}
