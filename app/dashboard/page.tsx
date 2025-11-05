"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Profile = {
  first_name?: string;
  last_name?: string;
  team?: string;
  strava_id?: string | null;
  user_id?: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🧭 Detect Guest Mode
  const isGuest = searchParams.get("guest") === "true";

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);

          // 🚀 If already connected to Strava, go straight to /app
          if (data?.strava_id && !isGuest) {
            router.push("/app");
          }
        } else if (isGuest) {
          // 👀 Fallback guest profile
          setProfile({
            user_id: "guest",
            first_name: "Guest",
            last_name: "Viewer",
            team: "—",
          });
        }
      } catch {
        if (isGuest) {
          setProfile({
            user_id: "guest",
            first_name: "Guest",
            last_name: "Viewer",
            team: "—",
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, isGuest]);

  const handleConnectToStrava = () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      alert("User ID missing — please re-register or refresh.");
      return;
    }

    window.location.href = `/api/strava/connect?user_id=${encodeURIComponent(
      userId
    )}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
        Loading dashboard...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
        No profile found. Please register.
      </div>
    );
  }

  // 👀 Guest Mode View
  if (isGuest || profile.user_id === "guest") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-950 text-white text-center p-6">
        <div className="bg-blue-900 p-8 rounded-2xl shadow-lg max-w-lg w-full">
          <h1 className="text-2xl font-bold mb-2">👋 Welcome, Guest!</h1>
          <p className="text-blue-200 mb-4">
            You’re viewing the Move-Athon Mania dashboard in <b>Visitor Mode</b>.
            Explore the leaderboard, team stats, and performance summaries.
          </p>
          <button
            onClick={() => router.push("/app?guest=true")}
            className="inline-block px-6 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-lg font-medium text-black transition-all"
          >
            View App as Guest →
          </button>

          <p className="text-xs text-blue-300 mt-4">
            (Some features like Strava sync and activity validation are disabled.)
          </p>
        </div>
      </div>
    );
  }

  // 👤 Normal Registered User View
  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
      <div className="bg-blue-900 p-8 rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {profile.first_name} {profile.last_name}!
        </h1>
        <p className="mb-4">Team: {profile.team ?? "Not Assigned"}</p>

        {!profile.strava_id ? (
          <button
            onClick={handleConnectToStrava}
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
          >
            Connect to Strava
          </button>
        ) : (
          <p className="text-green-400 font-semibold">
            Strava already connected ✓ Redirecting...
          </p>
        )}
      </div>
    </div>
  );
}
