"use client";

import { useEffect, useState } from "react";
import Stats from "@/components/Stats";
import { createClient } from "@supabase/supabase-js";
import { FaUsers } from "react-icons/fa"; // ✅ New icon import

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export default function StatsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const [globalTotals, setGlobalTotals] = useState({
    total_distance: 0,
    cycling_distance: 0,
    running_distance: 0,
    walking_distance: 0,
    total_participants: 0,
  });

  useEffect(() => {
    (async () => {
      const now = new Date();

      // Fetch valid activities only
      let query = supabase
        .from("activities")
        .select("user_id, type, distance, start_date")
        .eq("is_valid", true);

      if (now >= challengeStart) {
        query = query.gte("start_date", challengeStart.toISOString());
      }

      const { data: acts, error: actsError } = await query;
      if (actsError) {
        console.error("Error fetching stats activities:", actsError);
        return;
      }

      let total_distance = 0,
        cycling_distance = 0,
        running_distance = 0,
        walking_distance = 0;

      const participantSet = new Set<string>();

      (acts ?? []).forEach((a: any) => {
        const d = a?.distance ?? 0;
        total_distance += d;
        if (a.type === "Ride" || a.type === "VirtualRide") cycling_distance += d;
        if (a.type === "Run" || a.type === "TrailRun") running_distance += d;
        if (a.type === "Walk" || a.type === "Reclassified-Walk") walking_distance += d;
        if (a.user_id) participantSet.add(a.user_id);
      });

      setGlobalTotals({
        total_distance,
        cycling_distance,
        running_distance,
        walking_distance,
        total_participants: participantSet.size,
      });

      // Last refreshed
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
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-white">Move-a-thon Mania</h1>
        <p className="text-xl font-bold text-white">🏆 Overall Stats 🏆</p>
      </div>

      <hr className="my-2 border-gray-400" />

      {/* ✅ Total Participants Card (consistent size with others) */}
<div className="rounded-2xl shadow-md p-6 flex items-center justify-between bg-gradient-to-r from-blue-100 to-cyan-100 text-gray-900 border border-blue-200 min-h-[120px]">
  <div>
    <p className="text-gray-600 text-sm">Total Participants</p>
    <h2 className="text-3xl font-bold">{globalTotals.total_participants}</h2>
  </div>
  <FaUsers className="text-4xl text-blue-700" /> {/* ✅ Reduced size for balance */}
</div>

      {/* ✅ Main Stats Cards */}
      <Stats
        total_distance={globalTotals.total_distance}
        cycling_distance={globalTotals.cycling_distance}
        running_distance={globalTotals.running_distance}
        walking_distance={globalTotals.walking_distance}
      />

      {/* Last Refreshed */}
      {lastRefreshed && (
        <p className="text-sm text-gray-400 text-center mt-2">
          Last refreshed: {lastRefreshed}
        </p>
      )}
    </main>
  );
}
