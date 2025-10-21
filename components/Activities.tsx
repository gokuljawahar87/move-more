"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Footprints,
  Bike,
  Activity as RunIcon,
} from "lucide-react";

type Act = {
  id: number | string;
user_id: string; // ✅ Add this line
  name: string;
  type: string;
  derived_type?: string;
  distance: number;
  moving_time: number;
  start_date: string;
  strava_url?: string;
  profiles?: { first_name?: string; last_name?: string; team?: string };
};

const ALLOWED_TYPES = new Set([
  "Run",
  "TrailRun",
  "Walk",
  "Ride",
  "VirtualRide",
  "Reclassified-Walk", // ✅ Include derived type
]);

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
  const [toast, setToast] = useState<string | null>(null);

  async function fetchActivities() {
    try {
      const r = await fetch("/api/activities");
      let data: Act[] = await r.json();

      const now = new Date();
      if (now >= challengeStart) {
        data = data.filter((a) => new Date(a.start_date) >= challengeStart);
      }

      const filtered = (Array.isArray(data) ? data : [])
        .filter(
          (a) =>
            ALLOWED_TYPES.has(a.type) ||
            a.derived_type === "Reclassified-Walk" // ✅ Ensure reclassified included
        )
        .map((a) => ({ ...a, distance: Number(a.distance || 0) }))
        .sort(
          (x, y) =>
            new Date(x.start_date).getTime() - new Date(y.start_date).getTime()
        );

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
      const user_id = localStorage.getItem("user_id");
      if (!user_id) {
        setToast("⚠️ User not logged in.");
        return;
      }

      const res = await fetch("/api/strava/refresh-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Manual refresh failed:", result);
        setToast("❌ Failed to refresh activities.");
        return;
      }

      if (result.skipped) {
        setToast("ℹ️ No new or updated activities.");
      } else {
        const msg = `✅ ${result.refreshed || 0} updated, ${result.deleted || 0} deleted.`;
        setToast(msg);
      }

      await fetchActivities();
      await fetch("/api/sync/update-timestamp", { method: "POST" });
    } catch (err) {
      console.error("Refresh failed", err);
      setToast("❌ Refresh failed. Try again later.");
    } finally {
      setRefreshing(false);
      setTimeout(() => setToast(null), 4000);
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

  const getIcon = (type: string, size = 18) => {
    if (type === "Ride" || type === "VirtualRide")
      return <Bike size={size} className="text-blue-600" />;
    if (type === "Walk" || type === "Reclassified-Walk")
      return <Footprints size={size} className="text-green-600" />;
    return <RunIcon size={size} className="text-orange-500" />;
  };

  return (
    <div className="p-4 space-y-6 text-white relative">
      {/* ✅ Refresh button */}
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

      {/* 🟧 Master refresh (Admin only) */}
      {typeof window !== "undefined" &&
        localStorage.getItem("user_id") === "U262861" && (
          <button
            onClick={async () => {
              try {
                setRefreshing(true);
                const res = await fetch("/api/strava/refresh", { method: "POST" });
                const data = await res.json();
                if (res.ok) {
                  setToast("✅ All users refreshed successfully!");
                  await fetchActivities();
                } else {
                  setToast(`❌ Failed: ${data.error || "Unknown error"}`);
                }
              } catch (err) {
                console.error(err);
                setToast("❌ Error during master refresh.");
              } finally {
                setRefreshing(false);
                setTimeout(() => setToast(null), 4000);
              }
            }}
            disabled={refreshing}
            className="fixed bottom-24 right-6 w-10 h-10 rounded-full bg-orange-500 shadow-lg flex items-center justify-center 
                       hover:bg-orange-400 active:scale-95 transition-all disabled:opacity-50 z-[9999]"
            aria-label="Master refresh"
          >
            <RefreshCcw
              size={20}
              className={refreshing ? "animate-spin text-white" : "text-white"}
            />
          </button>
        )}

      {toast && (
        <div className="fixed bottom-10 right-6 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-lg text-sm animate-fadeIn z-[10000]">
          {toast}
        </div>
      )}

      {/* Weekly header + summary */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentWeekIndex((i) => Math.max(0, i - 1))}
            disabled={currentWeekIndex === 0}
            className="p-2 rounded-full bg-gray-700 disabled:opacity-40"
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
              setCurrentWeekIndex((i) => Math.min(weeksOrder.length - 1, i + 1))
            }
            disabled={currentWeekIndex === weeksOrder.length - 1}
            className="p-2 rounded-full bg-gray-700 disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Daily activity cards */}
      {Object.entries(days)
        .sort(([d1], [d2]) => new Date(d2).getTime() - new Date(d1).getTime())
        .map(([dateLabel, acts]) => (
          <div key={dateLabel} className="space-y-3">
            <div className="flex justify-between items-center">
  <span className="font-medium">{dateLabel}</span>

  {/* 🧍‍♂️ Show activities and unique participants count */}
  {(() => {
    const uniqueParticipants = new Set(acts.map((a) => a.user_id)).size;
    return (
      <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">
        {acts.length} activities • {uniqueParticipants} participants
      </span>
    );
  })()}
</div>

            <div className="space-y-3">
              {acts
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
                )
                .map((a) => {
                  const km = Number(a.distance || 0) / 1000;
                  const pace = km > 0 ? ((a.moving_time / 60) / km).toFixed(1) : "–";
                  const isReclassified =
                    a?.derived_type?.toLowerCase() === "reclassified-walk";

                  return (
                    <div
                      key={String(a.id)}
                      className="bg-white text-gray-900 p-4 rounded-xl shadow flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {a.profiles?.first_name ?? ""} {a.profiles?.last_name ?? ""}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(a.start_date).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {a.profiles?.team && (
                            <img
                              src={teamLogos[a.profiles.team] || "/logos/default.png"}
                              alt={a.profiles.team}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                            />
                          )}
                          <a
                            href={a.strava_url ?? `https://www.strava.com/activities/${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-500 hover:text-orange-600"
                          >
                            <ExternalLink size={20} />
                          </a>
                        </div>
                      </div>

                      <p className="text-md font-bold text-gray-800">{a.name}</p>

                      <div className="flex gap-3 items-center text-sm text-gray-700 mt-1">
                        {getIcon(isReclassified ? "Reclassified-Walk" : a.type)}
                        <span className="font-medium">
                          {isReclassified ? "Run → Walk" : a.type}
                        </span>
                        <span>{km.toFixed(1)} km</span>
                        <span>{pace} min/km</span>
                        <span>
                          {Math.floor(a.moving_time / 60)}m {a.moving_time % 60}s
                        </span>

                        {isReclassified && (
                          <span
                            title="Pace ≥ 8.5 min/km — reclassified as walk"
                            className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 font-medium"
                          >
                            Reclassified
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
    </div>
  );
}

/* Helpers */
function groupByWeek(activities: Act[]) {
  const map: Record<
    string,
    { label: string; start: number; days: Record<string, Act[]> }
  > = {};
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

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
  let run = 0,
    walk = 0,
    cycle = 0;

  Object.values(days).forEach((acts) => {
    acts.forEach((a) => {
      const km = Number(a.distance || 0) / 1000;
      if (a.type === "Run" || a.type === "TrailRun") run += km;
      else if (a.type === "Walk" || a.derived_type === "Reclassified-Walk") walk += km;
      else if (a.type === "Ride" || a.type === "VirtualRide") cycle += km;
    });
  });

  return { run, walk, cycle };
}
