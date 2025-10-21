"use client";

import { useEffect, useState } from "react";

type Activity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  strava_url: string;
  profiles: { first_name: string; last_name: string; team: string | null };
};

export default function SuspiciousActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperUser, setIsSuperUser] = useState(false);

  const SUPER_USERS = ["U262861", "U432088"];

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) {
      setUserId(storedId);
      setIsSuperUser(SUPER_USERS.includes(storedId));
    }
  }, []);

  useEffect(() => {
    async function fetchSuspicious() {
      if (!userId) return;
      try {
        const res = await fetch("/api/suspicious-activities");
        const data = await res.json();
        if (Array.isArray(data)) setActivities(data);
      } catch (err) {
        console.error("Failed to load suspicious activities:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSuspicious();
  }, [userId]);

  // 🧩 Group by team name
  const grouped = activities.reduce((acc: any, act) => {
    const team = act.profiles?.team || "No Team";
    if (!acc[team]) acc[team] = [];
    acc[team].push(act);
    return acc;
  }, {});

  if (loading)
    return <p className="p-4 text-gray-600 text-center">Loading suspicious activities...</p>;

  if (!activities.length)
    return (
      <p className="p-4 text-gray-600 text-center">
        ✅ No suspicious activities found.
      </p>
    );

  // 🏃 Icon helper
  const getIcon = (type: string) => {
    if (type === "Run" || type === "TrailRun") return "directions_run";
    if (type === "Walk" || type === "Reclassified-Walk") return "directions_walk";
    if (type === "Ride" || type === "VirtualRide") return "directions_bike";
    return "help";
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold text-center mb-4 text-red-600">
        🚨 Suspicious Activities
      </h1>

      {Object.keys(grouped).map((team) => (
        <div key={team} className="mb-6 bg-white rounded-2xl shadow-md p-4">
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-3">
            {team}
          </h2>

          <div className="space-y-3">
            {grouped[team].map((act: Activity) => {
              const icon = getIcon(act.type);
              const fullName = `${act.profiles?.first_name || ""} ${
                act.profiles?.last_name || ""
              }`.trim();

              return (
                <div
                  key={act.id}
                  className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-start gap-3"
                >
                  {/* Icon */}
                  <span className="material-symbols-outlined text-[28px] text-pink-600">
                    {icon}
                  </span>

                  {/* Details */}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{act.name}</p>
                    <p className="text-sm text-gray-700 font-medium">{fullName}</p>
                    <p className="text-sm text-gray-600">
                      {act.type} • {(act.distance / 1000).toFixed(2)} km •{" "}
                      {Math.round(act.moving_time / 60)} min
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(act.start_date).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>

                  {/* View Button */}
                  <a
                    href={act.strava_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg self-center"
                  >
                    View
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
