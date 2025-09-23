import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role key needed for server-side queries
)

export default async function handler(req, res) {
  try {
    // For now: fetch all activities (all employees)
    // Later we can filter by user_id if needed
    const { data, error } = await supabase
      .from("activities")
      .select(`
        id, name, type, distance, moving_time, start_date, strava_url,
        profiles (first_name, last_name, email)
      `)
      .order("start_date", { ascending: false })

    if (error) {
      console.error(error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
}
