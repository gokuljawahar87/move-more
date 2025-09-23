import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req, res) {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: "Missing user_id" })

  // 1. Get tokens from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user_id)
    .single()

  if (profileError || !profile) {
    return res.status(404).json({ error: "User not found" })
  }

  // 2. Fetch activities from Strava
  const stravaRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50`,
    {
      headers: { Authorization: `Bearer ${profile.access_token}` },
    }
  )
  const activities = await stravaRes.json()

  // 3. Transform for Supabase
  const formatted = activities.map((a: any) => ({
    id: a.id,
    user_id,
    name: a.name,
    type: a.type,
    distance: a.distance,
    moving_time: a.moving_time,
    start_date: a.start_date,
    strava_url: `https://www.strava.com/activities/${a.id}`,
  }))

  // 4. Insert/Update into Supabase
  const { error } = await supabase
    .from("activities")
    .upsert(formatted, { onConflict: "id" })

  if (error) return res.status(500).json({ error })

  res.json({ message: "Synced activities", count: formatted.length })
}
