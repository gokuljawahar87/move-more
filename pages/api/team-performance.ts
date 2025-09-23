// File: pages/api/team-performance.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  try {
    const { team } = req.query;
    if (!team) return res.status(400).json({ error: "Missing team parameter" });

    // 1. Get all activities + profile info for this team
    const { data, error } = await supabase
      .from("activities")
      .select(`
        id, type, distance, user_id,
        profiles (first_name, last_name, team)
      `)
      .eq("profiles.team", team);

    if (error) return res.status(500).json({ error });

    // 2. Aggregate per member
    const members: Record<string, any> = {};

    data.forEach((a: any) => {
      const km = a.distance / 1000;

      if (!members[a.user_id]) {
        members[a.user_id] = {
          name: `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`,
          run: 0,
          walk: 0,
          cycle: 0,
        };
      }

      if (a.type === "Run" || a.type === "TrailRun") members[a.user_id].run += km;
      if (a.type === "Walk") members[a.user_id].walk += km;
      if (a.type === "Ride") members[a.user_id].cycle += km;
    });

    res.json(Object.values(members));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
