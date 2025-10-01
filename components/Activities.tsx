"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  Bike,
  Footprints,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";

type Act = {
  id: number | string;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  strava_url?: string;
  profiles?: { first_name?: string; last_name?: string; team?: string };
  reactions?: { like?: number; love?: number; fire?: number };
};

const ALLOWED_TYPES = new Set(["Run", "TrailRun", "Walk", "Ride", "VirtualRide"]);
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

const teamLogos: Record<string, string> = {
  "THE POWERHOUSE": "/logos/powerhouse.png",
  "Corporate Crusaders": "/logos/crusaders.png",
  "RAC ROCKERS": "/logos/rockers.png",
  "ALPHA SQUAD": "/logos/alpha.png",
  "Black Forest Brigade": "/logos/brigade.png",
  "RACKETS": "/logos/rackets.png",
  "VIBE TRIBE": "/logos/vibe.png",
  "GOAT": "/logos/goat.png",
};

export function Activities() {
  const [activities, setActivities] = useState<Act[]>([]);
  const [weeksOrder, setWeeksOrder] = useState<string[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchActivities() {
    try {
      const r = await fetch("/api/activities");
      let data: Act[] = await r.json();

      // ✅ Only apply cutoff after 1 Oct 2025
      const now = new Date();
      if (now >= challengeStart) {
        data = data.filter((a) => new Date(a.start_date) >= challengeStart);
      }

      const filtered = (Array.isArray(data) ? data : [])
        .filter((a) => ALLOWED_TYPES.has(a.type))
        .map((a) => ({ ...a, distance: Number(a.distance || 0) }))
        .sort(
          (x, y) =>
            new Date(x.start_date).getTime() - new Date(y.start_date).getTime()
        );

      // Fetch reactions for all activities
const ids = filtered.map((a) => a.id);
if (ids.length > 0) {
  const res = await fetch("/api/reactions");
  const reactions = await res.json();

  // ✅ Safeguard: ensure it's an array
  const reactionArray = Array.isArray(reactions) ? reactions : [];

  // Map reactions by activity_id
  const reactionMap: Record<string, { like: number; love: number; fire: number }> = {};
  reactionArray.forEach((r: any) => {
    if (!reactionMap[r.activity_id])
      reactionMap[r.activity_id] = { like: 0, love: 0, fire: 0 };
    reactionMap[r.activity_id][r.reaction_type] = r.count;
  });

  filtered.forEach((a) => {
    a.reactions = reactionMap[a.id] || { like: 0, love: 0, fire: 0 };
  });
}

      setActivities(filtered);

      const grouped = groupByWeek(filtered);
      const keys = Object.keys(grouped).sort(
        (a, b) => grouped[a].start - grouped[b].start
      );
      setWeeksOrder(keys);
      setCurrentWeekIndex(Math.max(0, keys.length - 1));
    } catch (err) {
      console.error("Failed to load activities", err);
    }
  }

  useEffect(() => {
    fetchActivities();
  }, []);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/strava/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh activities");

      await fetchActivities();

      // ✅ Update sync_metadata timestamp
      await fetch("/api/sync/update-timestamp", { method: "POST" });
    } catch (err) {
      console.error("Refresh failed", err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleReaction(activityId: string | number, type: "like" | "love" | "fire") {
  try {
    // get user_id from localStorage (already stored when user registered/logged in)
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      console.error("No user_id found in localStorage");
      return;
    }

    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        activity_id: activityId, 
        reaction_type: type, 
        user_id: userId    // ✅ pass along
      }),
    });

    if (!res.ok) throw new Error("Failed to react");
    await fetchActivities(); // refresh counts
  } catch (err) {
    console.error("Reaction failed", err);
  }
}

  const grouped = useMemo(() => groupByWeek(activities), [activities]);

  if (weeksOrder.length === 0) {
    return (
      <div className="p-6 text-center text-gray-200">No activities yet.</div>
    );
  }

  const weekKey = weeksOrder[currentWeekIndex];
  const weekData = grouped[weekKey];
  const days = weekData?.days || {};
  const totals = computeWeekTotals(days);

  return (
    <div className="p-4 space-y-6 text-white relative">
      {/* Floating blue refresh button */}
<button
  onClick={handleRefresh}
  disabled={refreshing}
  className="fixed bottom-40 right-6 w-14 h-14 rounded-full bg-blue-600 shadow-xl flex items-center justify-center 
             hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 z-[9999] animate-bounce"
  aria-label="Refresh activities"
>
  <RefreshCcw
    size={28}
    className={refreshing ? "animate-spin text-white" : "text-white"}
  />
</button>

      {/* Week navigation */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentWeekIndex((i) => Math.max(0, i - 1))}
            disabled={currentWeekIndex === 0}
            className="p-2 rounded-full bg-gray-700 disabled:opacity-40"
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <div className="text-lg font-bold">{weekData.label}</div>
            <div className="flex gap-2 items-center justify-center mt-2">
              <span className="bg-white text-blue-900 px-2 py-0.5 rounded text-sm">
                Run {totals.run.toFixed(1)} km
              </span>
              <span className="bg-white text-blue-900 px-2 py-0.5 rounded text-sm">
                Cycle {totals.cycle.toFixed(1)} km
              </span>
              <span className="bg-white text-blue-900 px-2 py-0.5 rounded text-sm">
                Walk {totals.walk.toFixed(1)} km
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              setCurrentWeekIndex((i) =>
                Math.min(weeksOrder.length - 1, i + 1)
              )
            }
            disabled={currentWeekIndex === weeksOrder.length - 1}
            className="p-2 rounded-full bg-gray-700 disabled:opacity-40"
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Activities by day */}
      {Object.entries(days)
        .sort(([d1], [d2]) => new Date(d2).getTime() - new Date(d1).getTime())
        .map(([dateLabel, acts]) => (
          <div key={dateLabel} className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">{dateLabel}</span>
              <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">
                {acts.length} activities
              </span>
            </div>

            <div className="space-y-3">
              {acts
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.start_date).getTime() -
                    new Date(a.start_date).getTime()
                )
                .map((a) => (
                  <div
                    key={String(a.id)}
                    className="bg-white text-gray-900 p-4 rounded-xl shadow flex flex-col gap-3"
                  >
                    {/* User info + link */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {a.profiles?.first_name ?? ""}{" "}
                          {a.profiles?.last_name ?? ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(a.start_date).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {a.profiles?.team && (
                          <img
                            src={
                              teamLogos[a.profiles.team] ||
                              "/logos/default.png"
                            }
                            alt={a.profiles.team}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                          />
                        )}
                        <a
                          href={
                            a.strava_url ??
                            `https://www.strava.com/activities/${a.id}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-500 hover:text-orange-600"
                        >
                          <ExternalLink size={20} />
                        </a>
                      </div>
                    </div>

                    {/* Activity name + details */}
                    <p className="text-md font-bold text-gray-800">
                      {a.name}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-700 mt-1">
                      <span className="font-medium">{a.type}</span>
                      <span>{(Number(a.distance || 0) / 1000).toFixed(1)} km</span>
                      <span>
                        {Math.floor((a.moving_time || 0) / 60)}m{" "}
                        {Math.floor((a.moving_time || 0) % 60)}s
                      </span>
                    </div>

                    {/* ✅ Reactions */}
                    <div className="flex gap-6 mt-3 text-gray-600 text-sm">
                      <button
                        onClick={() => handleReaction(a.id, "like")}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        👍 <span>{a.reactions?.like || 0}</span>
                      </button>
                      <button
                        onClick={() => handleReaction(a.id, "love")}
                        className="flex items-center gap-1 hover:text-red-500"
                      >
                        ❤️ <span>{a.reactions?.love || 0}</span>
                      </button>
                      <button
                        onClick={() => handleReaction(a.id, "fire")}
                        className="flex items-center gap-1 hover:text-orange-500"
                      >
                        🔥 <span>{a.reactions?.fire || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}

/* Helpers */
function getActivityIcon(type: string) {
  switch (type) {
    case "Run":
    case "TrailRun":
      return <Footprints className="text-red-500" size={24} />;
    case "Ride":
    case "VirtualRide":
      return <Bike className="text-green-500" size={24} />;
    case "Walk":
      return <ActivityIcon className="text-blue-600" size={24} />;
    default:
      return <ActivityIcon size={24} />;
  }
}

function groupByWeek(activities: Act[]) {
  const map: Record<
    string,
    { label: string; start: number; days: Record<string, Act[]> }
  > = {};
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  activities.forEach((a) => {
    const d = new Date(a.start_date);
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekKey = weekStart.toISOString();
    const weekLabel = `${dateFmt.format(weekStart)} – ${dateFmt.format(
      weekEnd
    )}, ${weekEnd.getFullYear()}`;

    const dateLabel = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!map[weekKey])
      map[weekKey] = { label: weekLabel, start: weekStart.getTime(), days: {} };
    if (!map[weekKey].days[dateLabel]) map[weekKey].days[dateLabel] = [];
    map[weekKey].days[dateLabel].push(a);
  });

  return map;
}

function computeWeekTotals(days: Record<string, Act[]>) {
  let run = 0;
  let walk = 0;
  let cycle = 0;

  Object.values(days).forEach((acts) => {
    acts.forEach((a) => {
      const km = Number(a.distance || 0) / 1000;
      if (a.type === "Run" || a.type === "TrailRun") run += km;
      else if (a.type === "Walk") walk += km;
      else if (a.type === "Ride" || a.type === "VirtualRide") cycle += km;
    });
  });

  return { run, walk, cycle };
}
