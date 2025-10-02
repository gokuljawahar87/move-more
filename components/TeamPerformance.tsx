"use client";

import { useEffect, useState } from "react";

type Member = {
  name: string;
  run?: number | null;
  walk?: number | null;
  cycle?: number | null;
  run_km?: number | null;
  walk_km?: number | null;
  cycle_km?: number | null;
};

type Team = {
  team?: string;
  teamName?: string;
  members: Member[];
};

export function TeamPerformance() {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/team-performance");
        if (!res.ok) throw new Error("Failed to fetch team performance");
        const data = await res.json();

        setTeams(data || []);
      } catch (err) {
        console.error("Failed to load team performance:", err);
      }
    }
    fetchTeams();
  }, []);

  if (!teams.length) {
    return (
      <div className="p-6 text-center text-gray-200">
        No team performance data yet.
      </div>
    );
  }

  return (
    <div className="p-2 space-y-4">
      {teams.map((team, idx) => {
        const teamName = team.team ?? team.teamName ?? "Unnamed Team";

        return (
          <div
            key={teamName + idx}
            className="bg-white text-gray-900 rounded-xl shadow-md overflow-hidden border border-gray-200"
          >
            {/* Team header */}
            <div className="bg-blue-700 text-white px-3 py-2">
              <h2 className="text-base sm:text-lg font-semibold uppercase">
                {teamName}
              </h2>
            </div>

            {/* Team members table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs sm:text-sm text-center">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border w-1/4">Name</th>
                    <th className="p-2 border w-1/6">Walk (km)</th>
                    <th className="p-2 border w-1/6">Cycle (km)</th>
                    <th className="p-2 border w-1/6">Run (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m, i) => {
                    const run = m.run_km ?? m.run ?? 0;
                    const walk = m.walk_km ?? m.walk ?? 0;
                    const cycle = m.cycle_km ?? m.cycle ?? 0;

                    // ✅ Show only first name
                    const firstName = m.name?.split(" ")[0] ?? "";

                    return (
                      <tr
                        key={m.name + i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="p-1 sm:p-2 border text-center">
                          {firstName}
                        </td>
                        <td className="p-1 sm:p-2 border">{walk.toFixed(1)}</td>
                        <td className="p-1 sm:p-2 border">{cycle.toFixed(1)}</td>
                        <td className="p-1 sm:p-2 border">{run.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
