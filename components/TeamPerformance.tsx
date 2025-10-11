"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";

type Member = {
  name: string;
  run?: number | null;
  walk?: number | null;
  cycle?: number | null;
  run_km?: number | null;
  walk_km?: number | null;
  cycle_km?: number | null;
  points?: number | null;
};

type Team = {
  team?: string;
  teamName?: string;
  total_points?: number;
  totalPoints?: number;
  members: Member[];
};

export function TeamPerformance() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showOverall, setShowOverall] = useState<boolean>(false); // ✅ Toggle between daily & total

  async function fetchTeams(date?: string, showAll?: boolean) {
    try {
      let url = "/api/team-performance";

      // ✅ if daily mode and date is selected
      if (date && !showAll) url += `?date=${date}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch team performance");
      const data = await res.json();

      const sorted = (data || [])
        .map((t: Team) => {
          const totalPoints = t.total_points ?? t.totalPoints ?? 0;
          return { ...t, _points: totalPoints };
        })
        .sort((a: any, b: any) => b._points - a._points);

      setTeams(sorted);
    } catch (err) {
      console.error("Failed to load team performance:", err);
    }
  }

  useEffect(() => {
    fetchTeams(selectedDate, showOverall);
  }, [selectedDate, showOverall]);

  if (!teams.length) {
    return (
      <div className="p-6 text-center text-gray-200">
        No team performance data yet.
      </div>
    );
  }

  const getMedal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  };

  const getBorderClass = (rank: number) => {
    if (rank === 0) return "border-4 border-yellow-400";
    if (rank === 1) return "border-4 border-gray-400";
    if (rank === 2) return "border-4 border-amber-700";
    return "border border-gray-200";
  };

  return (
    <div className="p-2 space-y-4">
      {/* 🗓️ Date Picker + Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 bg-blue-700 text-white px-4 py-2 rounded-lg shadow gap-3 sm:gap-0">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} />
          <span className="font-medium text-sm sm:text-base">
            {showOverall ? "Overall Team Performance" : "Select Date to View Daily Performance"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!showOverall && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white text-blue-900 rounded px-2 py-1 text-sm focus:outline-none"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="text-sm underline text-blue-200 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* ✅ Switch button */}
          <button
            onClick={() => setShowOverall((prev) => !prev)}
            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-400 text-white font-medium px-3 py-1.5 rounded transition-all text-sm"
          >
            <RotateCcw size={14} />
            {showOverall ? "View Daily" : "View Overall"}
          </button>
        </div>
      </div>

      {/* 🏆 Teams */}
      {teams.map((team, idx) => {
        const teamName = team.team ?? team.teamName ?? "Unnamed Team";
        const totalPoints = team.total_points ?? team.totalPoints ?? 0;

        return (
          <div
            key={teamName + idx}
            className={`bg-white text-gray-900 rounded-xl shadow-md overflow-hidden ${getBorderClass(
              idx
            )}`}
          >
            {/* Header */}
            <div className="bg-blue-700 text-white px-3 py-2 flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-semibold uppercase flex items-center gap-2">
                {getMedal(idx)} {teamName}
              </h2>
              <span className="bg-white text-blue-800 font-semibold px-2 py-0.5 rounded-full text-sm sm:text-base">
                {totalPoints.toFixed(0)} pts
              </span>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs sm:text-sm text-center">
                <thead>
                  <tr className="bg-gray-100">
                    <th rowSpan={2} className="p-2 border w-1/4">
                      Name
                    </th>
                    <th className="p-2 border w-1/6">Walk</th>
                    <th className="p-2 border w-1/6">Cycle</th>
                    <th className="p-2 border w-1/6">Run</th>
                    <th rowSpan={2} className="p-2 border w-1/6">
                      Points
                    </th>
                  </tr>
                  {/* ✅ Fixed hydration-safe header */}
                  <tr className="bg-gray-100 text-[10px] sm:text-xs text-gray-600">
                    <th className="p-1 border">🚶 14 pts/km</th>
                    <th className="p-1 border">🚴 6 pts/km</th>
                    <th className="p-1 border">🏃 15 pts/km</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m, i) => {
                    const run = m.run_km ?? m.run ?? 0;
                    const walk = m.walk_km ?? m.walk ?? 0;
                    const cycle = m.cycle_km ?? m.cycle ?? 0;
                    const points = m.points ?? 0;
                    const firstName = m.name?.split(" ")[0] ?? "";

                    return (
                      <tr
                        key={m.name + i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="p-1 sm:p-2 border text-center">{firstName}</td>
                        <td className="p-1 sm:p-2 border">{walk.toFixed(1)}</td>
                        <td className="p-1 sm:p-2 border">{cycle.toFixed(1)}</td>
                        <td className="p-1 sm:p-2 border">{run.toFixed(1)}</td>
                        <td className="p-1 sm:p-2 border font-semibold">
                          {points.toFixed(0)}
                        </td>
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
