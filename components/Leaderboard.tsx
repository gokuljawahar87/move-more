import { useEffect, useState } from "react";

export function Leaderboard() {
  const [data, setData] = useState<any>({
    runners: [],
    walkers: [],
    cyclers: [],
    teams: [],
  });

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-4 space-y-6 bg-blue-950 min-h-screen text-white">
      <Section title="🏃 Top Runners" list={data.runners} metric="run" unit="km" />
      <Section title="🚶 Top Walkers" list={data.walkers} metric="walk" unit="km" />
      <Section title="🚴 Top Cyclers" list={data.cyclers} metric="cycle" unit="km" />
      <Section title="👥 Top Teams" list={data.teams} metric="points" unit="pts" isTeam />
    </div>
  );
}

function Section({ title, list, metric, unit, isTeam = false }: any) {
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
      <div className="space-y-2">
        {list.map((item: any, i: number) => (
          <div
            key={i}
            className={`bg-white text-gray-900 p-4 rounded-xl shadow flex justify-between items-center border-2 ${getCardStyle(i + 1)}`}
          >
            <span className="font-medium flex items-center gap-2">
              {getMedal(i + 1)} {isTeam ? item.team : item.name}
            </span>
            <span className="font-semibold">
              {isTeam ? item.points.toFixed(0) : item[metric].toFixed(1)} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
