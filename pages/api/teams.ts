// File: pages/api/teams.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  const { data, error } = await supabase.from("profiles").select("team").not("team", "is", null);

  if (error) return res.status(500).json({ error });

  // Unique list of teams
  const teams = Array.from(new Set(data.map((d) => d.team)));
  res.json(teams);
}
