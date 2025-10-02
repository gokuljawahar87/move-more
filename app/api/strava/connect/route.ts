// app/api/strava/connect/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    const redirectUrl = new URL("https://www.strava.com/oauth/authorize");
    redirectUrl.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set(
      "redirect_uri",
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback`
    );
    redirectUrl.searchParams.set("approval_prompt", "auto");
    redirectUrl.searchParams.set("scope", "read,activity:read_all");
    redirectUrl.searchParams.set("state", user_id); // ✅ user_id from query param

    return NextResponse.redirect(redirectUrl.toString());
  } catch (err: any) {
    console.error("Strava connect error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
