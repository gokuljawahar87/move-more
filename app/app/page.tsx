"use client";

import { useState } from "react";
import { Activities } from "@/components/Activities";
import Leaderboard from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import { Home, Trophy, Users } from "lucide-react";

export default function AppPage() {
  const [activeTab, setActiveTab] = useState("activities");

  return (
    <div className="flex flex-col min-h-screen bg-blue-950 text-white">
      {/* Header */}
      <Header />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto pb-24 mt-16">
        {activeTab === "activities" && <Activities />}
        {activeTab === "leaderboard" && <Leaderboard />}
        {activeTab === "teams" && <TeamPerformance />}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex 
        bg-pink-600/80 backdrop-blur-md 
        rounded-full shadow-xl px-12 py-3 space-x-12 z-50 transition">
        <button
          onClick={() => setActiveTab("activities")}
          className={`flex flex-col items-center text-sm ${
            activeTab === "activities" ? "text-white font-semibold" : "text-gray-200"
          }`}
        >
          <Home size={20} />
          <span>Activities</span>
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex flex-col items-center text-sm ${
            activeTab === "leaderboard" ? "text-white font-semibold" : "text-gray-200"
          }`}
        >
          <Trophy size={20} />
          <span>Leaderboard</span>
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex flex-col items-center text-sm ${
            activeTab === "teams" ? "text-white font-semibold" : "text-gray-200"
          }`}
        >
          <Users size={20} />
          <span>Teams</span>
        </button>
      </nav>
    </div>
  );
}
