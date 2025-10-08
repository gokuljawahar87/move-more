"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  first_name?: string;
  last_name?: string;
  team?: string;
  strava_id?: string | null;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);

        // 🚀 If already connected to Strava, go straight to /app
        if (data?.strava_id) {
          router.push("/app");
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleConnectToStrava = () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      alert("User ID missing — please re-register or refresh.");
      return;
    }

    // ✅ Append user_id to Strava connect URL
    window.location.href = `/api/strava/connect?user_id=${encodeURIComponent(userId)}`;
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
