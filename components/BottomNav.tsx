"use client";

import { useEffect, useState } from "react";

type Props = {
  activeTab:
    | "activities"
    | "leaderboard"
    | "teams"
    | "stats"
    | "championship";
  setActiveTab: (
    tab:
      | "activities"
      | "leaderboard"
      | "teams"
      | "stats"
      | "championship"
  ) => void;
};

export default function BottomNav({ activeTab, setActiveTab }: Props) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) setUserId(storedId);
  }, []);

  return (
    <div className="fixed bottom-4 inset-x-0 flex justify-center z-50">
      <div
        className="flex justify-around bg-pink-200 text-gray-800 rounded-3xl 
        px-4 py-2 shadow-lg w-[98%] max-w-2xl"
      >
        {/* Activities */}
        <button
          onClick={() => setActiveTab("activities")}
          className={`flex flex-col items-center ${
            activeTab === "activities" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            home
          </span>
          <span className="text-[10px] mt-0.5">Activities</span>
        </button>

        {/* Leaderboard (now podium icon) */}
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex flex-col items-center ${
            activeTab === "leaderboard" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            podium
          </span>
          <span className="text-[10px] mt-0.5">Leaderboard</span>
        </button>

        {/* Teams */}
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex flex-col items-center ${
            activeTab === "teams" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            groups
          </span>
          <span className="text-[10px] mt-0.5">Teams</span>
        </button>

        {/* Stats */}
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex flex-col items-center ${
            activeTab === "stats" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            query_stats
          </span>
          <span className="text-[10px] mt-0.5">Stats</span>
        </button>

        {/* Championship Dashboard */}
        <button
          onClick={() => setActiveTab("championship")}
          className={`flex flex-col items-center ${
            activeTab === "championship" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            emoji_events
          </span>
          <span className="text-[10px] mt-0.5">Champions</span>
        </button>
      </div>
    </div>
  );
}
