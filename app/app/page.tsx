"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activities } from "@/components/Activities";
import Leaderboard from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import StatsPage from "./stats/page";
import SuspiciousActivitiesPage from "../suspicious-activities/page"; // 🆕 Import Suspicious Page
import BottomNav from "@/components/BottomNav"; // ✅ Bottom Navigation

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<
    "activities" | "leaderboard" | "teams" | "stats" | "suspicious"
  >("activities");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Profile not found");

        const profile = await res.json();
        if (!profile || !profile.user_id) throw new Error("No profile found");

        // ✅ Save user_id in localStorage for fallback
        localStorage.setItem("user_id", profile.user_id);
      } catch (err) {
        console.warn("Profile check failed, trying restore:", err);

        // ✅ Attempt restoring from localStorage
        const savedUserId = localStorage.getItem("user_id");
        if (savedUserId) {
          try {
            const restoreRes = await fetch("/api/restore-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: savedUserId }),
            });

            if (restoreRes.ok) {
              const restoredProfile = await restoreRes.json();
              if (restoredProfile?.user_id) {
                localStorage.setItem("user_id", restoredProfile.user_id);
                setLoading(false);
                return;
              }
            }
          } catch (restoreErr) {
            console.error("Restore session failed:", restoreErr);
          }
        }

        // ❌ If all fails, redirect to registration
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

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto pb-32 pt-16">
        {activeTab === "activities" && <Activities />}
        {activeTab === "leaderboard" && <Leaderboard />}
        {activeTab === "teams" && <TeamPerformance />}
        {activeTab === "stats" && <StatsPage />}
        {activeTab === "suspicious" && <SuspiciousActivitiesPage />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
