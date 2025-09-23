// File: move-more/pages/api/strava/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing "code" in query' });
    }

    // 1) Exchange code for tokens with Strava
    const params = new URLSearchParams({
      client_id: String(STRAVA_CLIENT_ID),
      client_secret: String(STRAVA_CLIENT_SECRET),
      code: String(code),
      grant_type: "authorization_code",
    });

    const tokenResp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("Strava token exchange failed:", tokenData);
      return res.status(500).json({ error: "Strava token exchange failed", details: tokenData });
    }

    const { access_token, refresh_token, expires_at, athlete } = tokenData as any;

    // 2) Decide user_id to store in profiles
    //    - If you passed your app user id in "state" during OAuth start, use it
    //    - Otherwise fallback to a strava-prefixed id: "strava:<athlete.id>"
    const userId = typeof state === "string" && state ? state : `strava:${athlete?.id}`;

    // 3) Upsert into profiles table (save tokens + athlete name/email if available)
    const profilePayload = {
      user_id: userId,
      first_name: athlete?.firstname ?? null,
      last_name: athlete?.lastname ?? null,
      email: athlete?.email ?? null, // may be undefined depending on scopes
      access_token: access_token ?? null,
      refresh_token: refresh_token ?? null,
      expires_at: expires_at ? Number(expires_at) : null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Failed to upsert profile:", upsertError);
      // still try to continue, but return failure if needed. Here we'll return error:
      return res.status(500).json({ error: "Failed to save profile", details: upsertError });
    }

    // 4) Trigger immediate sync for this user (call your existing sync endpoint)
    //    Use a server-side request to your own API route.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
    const syncUrl = `${baseUrl.replace(/\/$/, "")}/api/strava/sync?user_id=${encodeURIComponent(userId)}`;

    try {
      // call sync endpoint (GET)
      // await to ensure activities are pulled before redirect if you prefer
      const syncResp = await fetch(syncUrl);
      if (!syncResp.ok) {
        // log but don't block redirect
        const txt = await syncResp.text().catch(() => "");
        console.warn("Sync endpoint returned non-OK:", syncResp.status, txt);
      }
    } catch (err) {
      console.warn("Failed to call sync endpoint:", err);
      // don't fail the flow — user still connected
    }

    // 5) Redirect the user into the app shell (mobile app landing)
    //    e.g., /app (you can append query params if needed)
    const redirectTo = `${baseUrl.replace(/\/$/, "")}/app?connected=1`;
    return res.redirect(302, redirectTo);
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
