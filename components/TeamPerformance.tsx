"use client";

import { useEffect, useState } from "react";

type Member = {
  name: string;
  run: number;
  walk: number;
  cycle: number;
  points: number;
};

type Team = {
  teamName: string;
  totalPoints: number;
  members: Member[];
};

export function TeamPerformance() {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetch("/api/team-performance")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // ✅ sort by points descending
          setTeams(data.sort((a, b) => b.totalPoints - a.totalPoints));
        }
      })
      .catch((err) => console.error("Failed to fetch teams:", err));
  }, []);

  if (teams.length === 0) {
    return (
      <div className="p-6 text-center text-gray-200 bg-blue-950 min-h-screen">
        No team data available yet.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-blue-950 min-h-screen text-white">
      {teams.map((team) => (
        <div
          key={team.teamName}
          className="bg-white text-gray-900 rounded-2xl shadow overflow-hidden"
        >
          {/* Team header */}
          <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-3">
            <h2 className="font-bold text-lg">{team.teamName}</h2>
            <span className="bg-white text-blue-900 px-3 py-1 rounded-full text-sm font-bold">
              {team.totalPoints.toFixed(0)} pts
            </span>
          </div>

          {/* Members */}
          <div className="p-4">
            <table className="w-full table-fixed text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="py-2 w-2/5">Name</th>
                  <th className="py-2 w-1/5">Run (km, 15 pts)</th>
                  <th className="py-2 w-1/5">Walk (km, 5 pts)</th>
                  <th className="py-2 w-1/5">Cycle (km, 10 pts)</th>
                  <th className="py-2 w-1/5">Points</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((m, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-none odd:bg-gray-50 even:bg-white"
                  >
                    <td className="py-2 truncate">{m.name}</td>
                    <td className="py-2">{m.run.toFixed(1)}</td>
                    <td className="py-2">{m.walk.toFixed(1)}</td>
                    <td className="py-2">{m.cycle.toFixed(1)}</td>
                    <td className="py-2 font-semibold">{m.points.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
