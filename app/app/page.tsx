"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activities } from "@/components/Activities";
import Leaderboard from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import StatsPage from "./stats/page";
import SuspiciousActivitiesPage from "../suspicious-activities/page";
import BottomNav from "@/components/BottomNav";

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<
    "activities" | "leaderboard" | "teams" | "stats" | "suspicious"
  >("activities");
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const guestMode = searchParams?.get?.("guest") === "true";
    setIsGuest(guestMode);

    async function checkProfile() {
      if (guestMode) {
        // 👀 Guest mode - allow immediate access, no login required
        localStorage.removeItem("user_id");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile");
        const profile = await res.json();

        if (!profile?.user_id) throw new Error("No profile found");
        localStorage.setItem("user_id", profile.user_id);
      } catch {
        const savedUser = localStorage.getItem("user_id");
        if (!savedUser) {
          router.replace("/register");
          return;
        }
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-blue-950">
        Checking profile...
      </div>
    );
  }

  /* ---------------------------
     🟡 GUEST MODE (READ-ONLY)
  ----------------------------*/
  if (isGuest) {
    return (
      <div className="flex flex-col min-h-screen bg-blue-950 text-white">
        <Header isGuest />

        {/* Banner */}
        <div className="bg-yellow-500 text-black py-2 text-sm font-semibold text-center shadow-md">
          👀 Viewing as Guest – Read-only mode
        </div>

        <div className="flex-1 overflow-y-auto pb-32 pt-16 px-2 sm:px-6">
          {activeTab === "activities" && <Activities isGuest />}
          {activeTab === "leaderboard" && <Leaderboard />}
          {activeTab === "teams" && <TeamPerformance />}
          {activeTab === "stats" && <StatsPage />}
          {activeTab === "suspicious" && (
            <div className="mt-10 text-blue-200 text-center">
              🚫 Suspicious activities are hidden in guest mode
            </div>
          )}
        </div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="py-3 text-xs text-blue-300 text-center border-t border-blue-800">
          <button
            className="underline text-blue-400 hover:text-blue-300"
            onClick={() => router.push("/register")}
          >
            Back to Employee Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------
     👤 NORMAL USER MODE
  ----------------------------*/
  return (
    <div className="flex flex-col min-h-screen bg-blue-950 text-white">
      <Header />

      <div className="flex-1 overflow-y-auto pb-32 pt-16">
        {activeTab === "activities" && <Activities />}
        {activeTab === "leaderboard" && <Leaderboard />}
        {activeTab === "teams" && <TeamPerformance />}
        {activeTab === "stats" && <StatsPage />}
        {activeTab === "suspicious" && <SuspiciousActivitiesPage />}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
