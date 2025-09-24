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

        // 🚀 if already connected to Strava, go straight to /app
        if (data?.strava_id) {
          router.push("/app");
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

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
          <a
            href="/api/strava/connect"
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
          >
            Connect to Strava
          </a>
        ) : (
          <p className="text-green-400 font-semibold">
            Strava already connected ✓ Redirecting...
          </p>
        )}
      </div>
    </div>
  );
}
