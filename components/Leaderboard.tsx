"use client";

import { useEffect, useState } from "react";

type LeaderboardEntry = {
  name?: string;
  team?: string;
  run?: number;
  walk?: number;
  cycle?: number;
  points?: number;
};

type LeaderboardData = {
  runners: LeaderboardEntry[];
  walkers: LeaderboardEntry[];
  cyclers: LeaderboardEntry[];
  teams: LeaderboardEntry[];
  topFemales?: LeaderboardEntry[];
};

// ✅ Team logos map
const teamLogos: Record<string, string> = {
  "THE POWERHOUSE": "/logos/powerhouse.png",
  "Corporate Crusaders": "/logos/crusaders.png",
  "RAC ROCKERS": "/logos/rockers.png",
  "ALPHA SQUAD": "/logos/alpha.png",
  "Black Forest Brigade": "/logos/brigade.png",
  "RACKETS": "/logos/rackets.png",
  "VIBE TRIBE": "/logos/vibe.png",
  "GOAT": "/logos/goat.png",
};

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData>({
    runners: [],
    walkers: [],
    cyclers: [],
    teams: [],
    topFemales: [],
  });

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => {
        console.error("Failed to fetch leaderboard:", err);
      });
  }, []);

  return (
    <div className="p-4 space-y-6 bg-blue-950 min-h-screen text-white">
      <Section title="🏃 Top Runners" list={data.runners} metric="run" unit="km" />
      <Section title="🚶 Top Walkers" list={data.walkers} metric="walk" unit="km" />
      <Section title="🚴 Top Cyclers" list={data.cyclers} metric="cycle" unit="km" />

      {/* 👩‍💼 New Diversity Section */}
      <Section
        title="👩‍💼 Top Diversity Candidate Performers"
        list={data.topFemales || []}
        metric="points"
        unit="pts"
      />

      <Section
        title="👥 Top Teams"
        list={data.teams}
        metric="points"
        unit="pts"
        isTeam
      />
    </div>
  );
}

function Section({
  title,
  list,
  metric,
  unit,
  isTeam = false,
}: {
  title: string;
  list: LeaderboardEntry[];
  metric: "run" | "walk" | "cycle" | "points";
  unit: string;
  isTeam?: boolean;
}) {
  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const getCardStyle = (rank: number) => {
    if (rank === 1) return "border-yellow-400";
    if (rank === 2) return "border-gray-400";
    if (rank === 3) return "border-amber-700";
    return "border-gray-200";
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      {list && list.length > 0 ? (
        <div className="space-y-2">
          {list.map((item, i) => {
            const showLogo =
              isTeam || (i < 3 && item.team && teamLogos[item.team]);

            return (
              <div
                key={i}
                className={`bg-white text-gray-900 p-4 rounded-xl shadow flex justify-between items-center border-2 ${getCardStyle(
                  i + 1
                )}`}
              >
                <span className="font-medium flex items-center gap-3">
                  {getMedal(i + 1)}
                  {showLogo && item.team && (
                    <img
                      src={teamLogos[item.team] || "/logos/default.png"}
                      alt={item.team}
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                  )}
                  {isTeam ? item.team : item.name}
                </span>
                <span className="font-semibold">
                  {Number(item[metric] ?? 0).toFixed(1)} {unit}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No data yet</p>
      )}
    </div>
  );
}
