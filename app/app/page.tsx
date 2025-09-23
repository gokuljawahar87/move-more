"use client";

import { useState } from "react";
import { Activities } from "@/components/Activities";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import { Home, Trophy, Users } from "lucide-react";

export default function AppShell() {
  const [tab, setTab] = useState("activities");

  return (
    <div className="flex flex-col h-screen bg-blue-950">
      {/* Fixed Header */}
      <Header />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pt-20">
        {tab === "activities" && <Activities />}
        {tab === "leaderboard" && <Leaderboard />}
        {tab === "team" && <TeamPerformance />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-200 rounded-2xl shadow-lg px-6 py-3 flex justify-between w-[90%] max-w-md">
        <button
          onClick={() => setTab("activities")}
          className={`flex flex-col items-center text-xs ${
            tab === "activities" ? "text-red-700" : "text-gray-600"
          }`}
        >
          <Home size={22} />
          <span>Activities</span>
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`flex flex-col items-center text-xs ${
            tab === "leaderboard" ? "text-red-700" : "text-gray-600"
          }`}
        >
          <Trophy size={22} />
          <span>Leaderboard</span>
        </button>
        <button
          onClick={() => setTab("team")}
          className={`flex flex-col items-center text-xs ${
            tab === "team" ? "text-red-700" : "text-gray-600"
          }`}
        >
          <Users size={22} />
          <span>Teams</span>
        </button>
      </nav>
    </div>
  );
}
