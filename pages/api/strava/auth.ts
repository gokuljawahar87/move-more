// File: move-more/pages/api/strava/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query; // optional - pass your app user id here
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/strava/callback`;

  const params = new URLSearchParams({
    client_id: String(process.env.STRAVA_CLIENT_ID),
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "activity:read_all,profile:read_all", // adjust scopes as needed
    state: String(user_id ?? ""), // pass app user id here so callback knows who to attach tokens to
  });

  const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  return res.redirect(302, url);
}
