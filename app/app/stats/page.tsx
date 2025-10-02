"use client";

import { useEffect, useState } from "react";
import Stats from "@/components/Stats";
import { createClient } from "@supabase/supabase-js";

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export default function StatsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Global data
  const [globalTotals, setGlobalTotals] = useState({
    total_distance: 0,
    cycling_distance: 0,
    running_distance: 0,
    walking_distance: 0,
  });

  useEffect(() => {
    (async () => {
      const now = new Date();

      // 1. Build query
      let query = supabase
  .from("activities")
  .select("type, distance, start_date")
  .eq("is_valid", true);   // ✅ only valid activities


      // ✅ Only apply cutoff after 1 Oct 2025 midnight IST
      if (now >= challengeStart) {
        query = query.gte("start_date", challengeStart.toISOString());
      }

      const { data: acts, error: actsError } = await query;

      if (actsError) {
        console.error("Error fetching stats activities:", actsError);
      }

      let total_distance = 0,
        cycling_distance = 0,
        running_distance = 0,
        walking_distance = 0;

      (acts ?? []).forEach((a: any) => {
        const d = a?.distance ?? 0;
        total_distance += d;
        if (a.type === "Ride") cycling_distance += d;
        if (a.type === "Run") running_distance += d;
        if (a.type === "Walk") walking_distance += d;
      });

      setGlobalTotals({
        total_distance,
        cycling_distance,
        running_distance,
        walking_distance,
      });

      // 2. Last refreshed timestamp
      const { data: metadata } = await supabase
        .from("sync_metadata")
        .select("last_refreshed_at")
        .eq("id", 1)
        .single();

      if (metadata?.last_refreshed_at) {
        setLastRefreshed(
          new Date(metadata.last_refreshed_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        );
      }
    })();
  }, [supabase]);

  return (
    <main className="p-6 flex flex-col gap-6">
      {/* Title */}
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-white">Move-a-thon Mania</h1>
        <p className="text-xl font-bold text-white">🏆 Overall Stats 🏆</p>
      </div>

      <hr className="my-2 border-gray-400" />

      {/* Global stats */}
      <Stats
        total_distance={globalTotals.total_distance}
        cycling_distance={globalTotals.cycling_distance}
        running_distance={globalTotals.running_distance}
        walking_distance={globalTotals.walking_distance}
      />

      {/* Last refreshed */}
      {lastRefreshed && (
        <p className="text-sm text-gray-400 text-center mt-2">
          Last refreshed: {lastRefreshed}
        </p>
      )}
    </main>
  );
}
