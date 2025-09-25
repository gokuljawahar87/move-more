"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activities } from "@/components/Activities";
import Leaderboard from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import { Home, Trophy, Users } from "lucide-react";

export default function AppPage() {
  const [activeTab, setActiveTab] = useState("activities");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Profile not found");
        const profile = await res.json();
        if (!profile || !profile.user_id) {
          router.replace("/register");
        }
      } catch (err) {
        router.replace("/register");
      } finally {
        setLoading(false);
      }
    }
    checkProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-blue-950">
        Checking profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-blue-950 text-white">
      {/* Header */}
      <Header />

      {/* Main content - add top padding so header does not overlap */}
      <div className="flex-1 overflow-y-auto pb-32 pt-16">
        {activeTab === "activities" && <Activities />}
        {activeTab === "leaderboard" && <Leaderboard />}
        {activeTab === "teams" && <TeamPerformance />}
      </div>

      {/* Bottom navigation pill */}
      <nav
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex w-[90%] max-w-2xl 
        bg-pink-700 rounded-full shadow-lg px-10 py-4 justify-around items-center z-50"
      >
        <button
          onClick={() => setActiveTab("activities")}
          className={`flex flex-col items-center text-sm ${
            activeTab === "activities" ? "text-white font-bold" : "text-gray-200"
          }`}
        >
          <Home
            size={26}
            className={activeTab === "activities" ? "text-white" : "text-gray-200"}
          />
          <span>Activities</span>
        </button>

        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex flex-col items-center text-sm ${
            activeTab === "leaderboard" ? "text-white font-bold" : "text-gray-200"
          }`}
        >
          <Trophy
            size={26}
            className={activeTab === "leaderboard" ? "text-white" : "text-gray-200"}
          />
          <span>Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab("teams")}
          className={`flex flex-col items-center text-sm ${
            activeTab === "teams" ? "text-white font-bold" : "text-gray-200"
          }`}
        >
          <Users
            size={26}
            className={activeTab === "teams" ? "text-white" : "text-gray-200"}
          />
          <span>Teams</span>
        </button>
      </nav>
    </div>
  );
}
