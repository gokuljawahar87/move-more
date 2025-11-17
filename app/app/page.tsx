"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activities } from "@/components/Activities";
import Leaderboard from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import StatsPage from "./stats/page";
import PointsChampions from "@/components/PointsChampions";   // ⭐ NEW
import BottomNav from "@/components/BottomNav";

function AppContent() {
  const [activeTab, setActiveTab] = useState<
    "activities" | "leaderboard" | "teams" | "stats" | "championship"
  >("activities");

  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const guestMode = searchParams?.get("guest") === "true";
    setIsGuest(guestMode);

    async function checkProfile() {
      if (guestMode) {
        console.log("🟡 Guest mode — skipping profile fetch");
        localStorage.removeItem("user_id");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Profile not found");

        const profile = await res.json();
        if (!profile || !profile.user_id) throw new Error("No profile found");

        localStorage.setItem("user_id", profile.user_id);
      } catch {
        const savedUserId = localStorage.getItem("user_id");

        if (savedUserId) {
          try {
            const restoreRes = await fetch("/api/restore-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: savedUserId }),
            });

            if (restoreRes.ok) {
              const restored = await restoreRes.json();
              if (restored?.user_id) {
                localStorage.setItem("user_id", restored.user_id);
                setLoading(false);
                return;
              }
            }
          } catch {}
        }

        router.replace("/register");
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

  // ⭐ Guest UI
  if (isGuest) {
    return (
      <div className="flex flex-col min-h-screen bg-blue-950 text-white">
        <Header isGuest />

        {/* Fixed guest banner */}
        <div className="fixed top-[56px] left-0 right-0 bg-yellow-500 text-black py-2 text-sm font-semibold text-center shadow-md z-30">
          👀 Viewing as Guest – Read-only mode
        </div>

        <div className="h-[32px]" />

        <div className="flex-1 overflow-y-auto pb-32 pt-24 px-2 sm:px-6">
          {activeTab === "activities" && <Activities />}
          {activeTab === "leaderboard" && <Leaderboard />}
          {activeTab === "teams" && <TeamPerformance />}
          {activeTab === "stats" && <StatsPage />}
          {activeTab === "championship" && <PointsChampions />}
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

  // 🎯 Normal User UI
  return (
    <div className="flex flex-col min-h-screen bg-blue-950 text-white">
      <Header />

      <div className="flex-1 overflow-y-auto pb-32 pt-16">
        {activeTab === "activities" && <Activities />}
        {activeTab === "leaderboard" && <Leaderboard />}
        {activeTab === "teams" && <TeamPerformance />}
        {activeTab === "stats" && <StatsPage />}
        {activeTab === "championship" && <PointsChampions />} {/* ⭐ NEW */}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="text-white text-center p-6">Loading...</div>}>
      <AppContent />
    </Suspense>
  );
}
