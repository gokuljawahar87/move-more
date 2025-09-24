// app/api/strava/connect/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // ✅ Await cookies() in Next.js 15
    const cookieStore = await cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json(
        { error: "User not logged in" },
        { status: 401 }
      );
    }

    const redirectUrl = new URL("https://www.strava.com/oauth/authorize");
    redirectUrl.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback`);
    redirectUrl.searchParams.set("approval_prompt", "auto");
    redirectUrl.searchParams.set("scope", "read,activity:read_all");
    redirectUrl.searchParams.set("state", user_id); // ✅ use logged-in user_id

    return NextResponse.redirect(redirectUrl.toString());
  } catch (err: any) {
    console.error("Strava connect error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
