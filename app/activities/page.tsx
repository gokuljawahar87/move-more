"use client";

import { useEffect, useState } from "react";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔧 Replace with logged-in user's ID from your app/session
  const userId = "U262861";

  useEffect(() => {
    async function fetchActivitiesFlow() {
      try {
        // Step 1: Load tokens from our /api/profile
        const profileRes = await fetch(`/api/profile?user_id=${userId}`);
        const profile = await profileRes.json();

        if (!profileRes.ok) {
          console.error("❌ Failed to load profile:", profile);
          setError(`Profile fetch failed: ${JSON.stringify(profile)}`);
          setLoading(false);
          return;
        }

        if (!profile.refresh_token) {
          setError("No refresh_token found for user. Please reconnect Strava.");
          setLoading(false);
          return;
        }

        let accessToken = profile.access_token;
        const expiresAt = profile.expires_at;

        // Step 2: If token expired, refresh it
        if (Date.now() / 1000 > expiresAt) {
          console.log("🔄 Access token expired, refreshing...");

          const refreshRes = await fetch("/api/strava/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              refresh_token: profile.refresh_token,
            }),
          });

          const refreshData = await refreshRes.json();

          if (!refreshRes.ok) {
            console.error("❌ Refresh failed:", refreshData);
            setError(`Refresh failed: ${JSON.stringify(refreshData)}`);
            setLoading(false);
            return;
          }

          accessToken = refreshData.access_token;
        }

        // Step 3: Fetch activities from Strava API
        const actRes = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?per_page=5`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const actData = await actRes.json();

        if (!actRes.ok) {
          console.error("❌ Strava fetch error:", actData);
          setError(`Strava fetch failed: ${JSON.stringify(actData)}`);
          setLoading(false);
          return;
        }

        setActivities(actData);
        setLoading(false);
      } catch (err: any) {
        console.error("❌ Unexpected error:", err);
        setError("Unexpected error fetching activities.");
        setLoading(false);
      }
    }

    fetchActivitiesFlow();
  }, []);

  if (loading) return <p className="text-white">Loading activities...</p>;

  if (error)
    return (
      <div className="bg-red-900 text-red-200 p-4 rounded-lg">
        <p className="font-bold">Error:</p>
        <p>{error}</p>
      </div>
    );

  if (!activities.length)
    return <p className="text-white">No activities found.</p>;

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">Your Last 5 Strava Activities</h2>
      <div className="space-y-4">
        {activities.map((act, i) => (
          <div
            key={i}
            className="p-4 bg-gray-800 rounded-lg shadow-md hover:bg-gray-700 transition"
          >
            <h3 className="text-lg font-semibold">{act.name}</h3>
            <p>
              {act.type} • {(act.distance / 1000).toFixed(2)} km •{" "}
              {Math.round(act.moving_time / 60)} min
            </p>
            <p className="text-sm text-gray-400">
              {new Date(act.start_date).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
