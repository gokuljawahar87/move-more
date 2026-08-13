"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Activities } from "@/components/Activities";
import Leaderboard from "@/components/Leaderboard";
import { TeamPerformance } from "@/components/TeamPerformance";
import { Header } from "@/components/Header";
import StatsPage from "./stats/page";
import PointsChampions from "@/components/PointsChampions";
import BottomNav from "@/components/BottomNav";
import { showChampions } from "@/lib/season";

type Tab = "activities" | "leaderboard" | "teams" | "stats" | "championship";

/**
 * Is this profile response good enough to enter the app?
 *
 * /api/profile always returns HTTP 200, even when the person hasn't
 * registered — it signals that in the body instead. The old code only
 * checked res.ok and profile.user_id, so a Season 1 profile passed
 * straight through and landed in the app with no team.
 */
function isRegisteredThisSeason(profile: any): boolean {
  if (!profile || !profile.user_id) return false;
  if (profile.not_employee) return false; // not on this year's roster
  if (profile.no_profile) return false; // never registered, or Season 1
  return true;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("activities");
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const guestMode = searchParams?.get("guest") === "true";
    setIsGuest(guestMode);

    async function checkProfile() {
      if (guestMode) {
        localStorage.removeItem("user_id");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile");
        const profile = res.ok ? await res.json() : null;

        if (isRegisteredThisSeason(profile)) {
          localStorage.setItem("user_id", profile.user_id);
          setLoading(false);
          return;
        }

        // Not registered this season. Try restoring a session first —
        // but only accept the result if it also passes the same gate,
        // otherwise restore-session would let a Season 1 user back in.
        const savedUserId = localStorage.getItem("user_id");

        if (savedUserId) {
          try {
            const restoreRes = await fetch("/api/restore-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: savedUserId }),
            });

            if (restoreRes.ok) {
              const recheck = await fetch("/api/profile");
              const restored = recheck.ok ? await recheck.json() : null;

              if (isRegisteredThisSeason(restored)) {
                localStorage.setItem("user_id", restored.user_id);
                setLoading(false);
                return;
              }
            }
          } catch {
            // fall through to registration
          }
        }

        // Stale identity — clear it so the registration page starts clean
        localStorage.removeItem("user_id");
        router.replace("/register");
      } catch (err) {
        console.error("Profile check failed:", err);
        router.replace("/register");
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="animate-spin text-tape" size={22} />
        <p className="eyebrow text-[10px]">Checking your bib</p>
      </div>
    );
  }

  const tabs = (
    <>
      {activeTab === "activities" && <Activities />}
      {activeTab === "leaderboard" && <Leaderboard />}
      {activeTab === "teams" && <TeamPerformance />}
      {activeTab === "stats" && <StatsPage />}
      {activeTab === "championship" && showChampions() && <PointsChampions />}
    </>
  );

  // ── Guest view ─────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header isGuest />

        <div className="shrink-0 bg-tape text-ink-950 py-2 text-center font-display font-600 uppercase tracking-[0.14em] text-[11px]">
          Viewing as guest — read only
        </div>

        <div className="flex-1 overflow-y-auto pb-32 px-2 sm:px-6">{tabs}</div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="py-3 text-center border-t border-ink-800">
          <button
            className="font-display uppercase tracking-[0.12em] text-[11px] text-chalk-dim hover:text-tape transition-colors"
            onClick={() => router.push("/register")}
          >
            Back to employee login
          </button>
        </div>
      </div>
    );
  }

  // ── Registered user ────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1 overflow-y-auto pb-32">{tabs}</div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-tape" size={22} />
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
