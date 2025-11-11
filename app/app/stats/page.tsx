"use client";

import { useEffect, useState } from "react";
import Stats from "@/components/Stats";
import { FaUsers } from "react-icons/fa";

export default function StatsPage() {
  const [globalTotals, setGlobalTotals] = useState({
    total_distance: 0,
    cycling_distance: 0,
    running_distance: 0,
    walking_distance: 0,
    total_participants: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const perfRes = await fetch("/api/team-performance");
        const perfJson = await perfRes.json();
        const teams = Array.isArray(perfJson) ? perfJson : perfJson?.teams ?? [];

        let run = 0,
          walk = 0,
          cycle = 0;

        const participantSet = new Set<string>();

        teams.forEach((team: any) => {
          (team.members || []).forEach((m: any) => {
            walk += m.walk || 0;   // ✅ Already KM
            run += m.run || 0;     // ✅ Already KM
            cycle += m.cycle || 0; // ✅ Already KM

            if ((m.walk || m.run || m.cycle) > 0) participantSet.add(m.name);
          });
        });

        setGlobalTotals({
          total_distance: walk + run + cycle,
          walking_distance: walk,
          running_distance: run,
          cycling_distance: cycle,
          total_participants: participantSet.size,
        });
      } catch (err) {
        console.error("StatsPage error:", err);
      }
    })();
  }, []);

  return (
    <main className="p-6 flex flex-col gap-6">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-white">Move-a-thon Mania</h1>
        <p className="text-xl font-bold text-white">🏆 Overall Stats 🏆</p>
      </div>

      <hr className="my-2 border-gray-400" />

      {/* Total Participants */}
      <div className="rounded-2xl shadow-md p-6 flex items-center justify-between bg-gradient-to-r from-blue-100 to-cyan-100 text-gray-900 border border-blue-200 min-h-[120px]">
        <div>
          <p className="text-gray-600 text-sm">Total Participants</p>
          <h2 className="text-3xl font-bold">{globalTotals.total_participants}</h2>
        </div>
        <FaUsers className="text-4xl text-blue-700" />
      </div>

      {/* Stats Summary */}
      <Stats
        total_distance={globalTotals.total_distance}
        cycling_distance={globalTotals.cycling_distance}
        running_distance={globalTotals.running_distance}
        walking_distance={globalTotals.walking_distance}
      />
    </main>
  );
}
