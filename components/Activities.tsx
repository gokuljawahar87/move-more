// components/Activities.tsx
"use client";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Footprints,
  Bike,
  Activity as RunIcon,
} from "lucide-react";
import { SEASON } from "@/lib/season";
import { teamLogo, teamName } from "@/lib/teams";

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
  on_leave_day?: boolean;
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

// Season dates come from lib/season.ts rather than being hardcoded.
const challengeStart = SEASON.start;

// Team logos now come from lib/teams.ts — see Leaderboard.tsx too.

export function Activities() {
  const [activities, setActivities] = useState<Act[]>([]);
  // Filters. The weekly run/walk/cycle totals used to sit here, but
  // those numbers are already on the Stats page — what the feed is
  // actually used for is finding one person's activity on one day.
  const [fTeam, setFTeam] = useState("");
  const [fPerson, setFPerson] = useState("");
  const [fDate, setFDate] = useState("");
  const [weeksOrder, setWeeksOrder] = useState<string[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  // Strava's rate limit is shared across everyone using the app, so one
  // person holding down the button degrades it for the whole team.
  const [cooldownUntil, setCooldownUntil] = useState(0);
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
    if (Date.now() < cooldownUntil) {
      setToast("Just a moment — try again shortly.");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      setRefreshing(true);
      setCooldownUntil(Date.now() + 15_000);
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
        // Tell people what actually happened. A rate limit isn't a
        // failure on their part, and their activity will still arrive.
        setToast(result.message ?? "Couldn't refresh. Try again shortly.");
        if (res.status === 429) setCooldownUntil(Date.now() + 60_000);
        return;
      }

      const added = result.refreshed || 0;
      const removed = result.deleted || 0;

      if (added === 0 && removed === 0) {
        setToast(
          result.fetchedFromStrava === 0
            ? "Nothing new on Strava yet."
            : "Already up to date."
        );
      } else {
        const parts: string[] = [];
        if (added) parts.push(`${added} added`);
        if (removed) parts.push(`${removed} removed`);
        setToast(parts.join(", ") + ".");
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

  // The refresh controls render here too. They used to sit below this
  // early return, so an empty feed had no way to pull data in — exactly
  // the moment you most want the button.
  const refreshControls = (
    <>
    {/* ✅ Refresh button */}
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="fixed bottom-28 right-5 w-14 h-14 rounded-full bg-tape flex items-center justify-center
                 active:scale-95 transition-transform disabled:opacity-50 z-[45]
                 shadow-lg shadow-black/40"
      aria-label="Refresh activities"
    >
      <RefreshCcw
        size={24}
        strokeWidth={2.4}
        className={refreshing ? "animate-spin text-ink-950" : "text-ink-950"}
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
          className="fixed bottom-[184px] right-5 w-10 h-10 rounded-full border border-ink-700
                     bg-ink-900 flex items-center justify-center active:scale-95
                     transition-transform disabled:opacity-50 z-[45]"
          aria-label="Master refresh"
        >
          <RefreshCcw
            size={17}
            className={refreshing ? "animate-spin text-tape" : "text-tape"}
          />
        </button>
      )}

    {toast && (
      <div className="fixed bottom-24 left-4 right-4 bg-ink-800 border border-ink-700 text-chalk px-4 py-2.5 rounded-xl text-sm text-center z-[46]">
        {toast}
      </div>
    )}

    </>
  );

  if (weeksOrder.length === 0) {
    return (
      <div className="relative min-h-[60vh]">
        {refreshControls}
        <div className="px-6 py-16 text-center">
          <p className="font-display uppercase tracking-wide text-lg">
            Nothing here yet
          </p>
          <p className="split text-chalk-dim mt-1.5">
            Record an activity, then tap refresh to pull it in.
          </p>
        </div>
      </div>
    );
  }

  // ── Filters ──────────────────────────────────────────────────
  // Dropdowns are built from the activities actually loaded, so they
  // never offer a team or a person with nothing to show.
  const personName = (a: Act) =>
    `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`.trim();

  const teamOptions = Array.from(
    new Set(activities.map((a) => a.profiles?.team).filter(Boolean) as string[])
  ).sort((x, y) => teamName(x).localeCompare(teamName(y)));

  const personOptions = Array.from(
    new Set(
      activities
        .filter((a) => !fTeam || a.profiles?.team === fTeam)
        .map(personName)
        .filter(Boolean)
    )
  ).sort();

  const filtersOn = !!(fTeam || fPerson || fDate);

  const matches = (a: Act) => {
    if (fTeam && a.profiles?.team !== fTeam) return false;
    if (fPerson && personName(a) !== fPerson) return false;
    if (fDate) {
      const ist = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(a.start_date));
      if (ist !== fDate) return false;
    }
    return true;
  };

  // A date search looks across the whole season, not just the week on
  // screen — otherwise picking a date outside it returns nothing and
  // looks broken.
  const matchCount = (fDate ? activities : activities).filter(matches).length;

  const weekKey = weeksOrder[currentWeekIndex];
  const weekData = grouped[weekKey];
  const days = weekData?.days || {};

  /**
   * The days actually rendered.
   *
   * Without a date the week on screen is filtered in place. WITH a
   * date, the search runs across the whole season and jumps to it —
   * otherwise picking a day outside the current week would return
   * nothing and look broken.
   */
  const visibleDays: Record<string, Act[]> = (() => {
    if (!filtersOn) return days;

    const source: Act[] = fDate
      ? activities
      : (Object.values(days).flat() as Act[]);

    const kept = source.filter(matches);

    const out: Record<string, Act[]> = {};
    for (const a of kept) {
      const label = new Date(a.start_date).toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      out[label] = [...(out[label] ?? []), a];
    }
    return out;
  })();

  const getIcon = (type: string, size = 18) => {
    if (type === "Ride" || type === "VirtualRide")
      return <Bike size={size} className="text-blue-600" />;
    if (type === "Walk" || type === "Reclassified-Walk")
      return <Footprints size={size} className="text-green-600" />;
    return <RunIcon size={size} className="text-orange-500" />;
  };

  return (
    <div className="p-4 space-y-6 text-white relative">
      {refreshControls}

      {/* Week navigation, then filters. */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentWeekIndex((i: number) => Math.max(0, i - 1))}
          disabled={currentWeekIndex === 0}
          aria-label="Previous week"
          className="p-2 rounded-full border border-ink-800 text-chalk-dim disabled:opacity-30 shrink-0"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="font-display font-600 uppercase tracking-wide text-[15px] text-center min-w-0 truncate">
          {weekData.label}
        </div>

        <button
          onClick={() =>
            setCurrentWeekIndex((i: number) =>
              Math.min(weeksOrder.length - 1, i + 1)
            )
          }
          disabled={currentWeekIndex === weeksOrder.length - 1}
          aria-label="Next week"
          className="p-2 rounded-full border border-ink-800 text-chalk-dim disabled:opacity-30 shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="bib px-3.5 pt-4 pb-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="eyebrow text-[9px]">Find an activity</p>
          {filtersOn && (
            <button
              onClick={() => {
                setFTeam("");
                setFPerson("");
                setFDate("");
              }}
              className="split text-tape"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={fTeam}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setFTeam(e.target.value);
              setFPerson(""); // the person list depends on the team
            }}
            className="bg-ink-950 border border-ink-800 rounded-lg px-2.5 py-2
                       text-chalk text-sm focus:border-tape focus:outline-none"
          >
            <option value="">All teams</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>
                {teamName(t)}
              </option>
            ))}
          </select>

          <select
            value={fPerson}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setFPerson(e.target.value)
            }
            className="bg-ink-950 border border-ink-800 rounded-lg px-2.5 py-2
                       text-chalk text-sm focus:border-tape focus:outline-none"
          >
            <option value="">Everyone</option>
            {personOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFDate(e.target.value)
            }
            className="col-span-2 bg-ink-950 border border-ink-800 rounded-lg px-2.5 py-2
                       text-chalk text-sm focus:border-tape focus:outline-none
                       [color-scheme:dark]"
          />
        </div>

        {filtersOn && (
          <p className="split text-chalk-dim mt-2.5">
            {matchCount} {matchCount === 1 ? "activity" : "activities"} match
            {fDate ? "" : " this week"}
          </p>
        )}
      </div>

      {filtersOn && Object.keys(visibleDays).length === 0 && (
        <div className="bib px-4 pt-5 pb-4 text-center">
          <p className="split text-chalk-dim">
            Nothing matches those filters.
          </p>
        </div>
      )}

      {/* Daily activity cards */}
      {Object.entries(visibleDays)
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
                          {teamLogo(a.profiles?.team) && (
                            <img
                              src={teamLogo(a.profiles?.team)!}
                              alt={teamName(a.profiles?.team)}
                              className="w-12 h-12 rounded-full object-cover ring-1 ring-ink-700"
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

                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-md font-bold text-gray-800">{a.name}</p>

                        {/* Visible declaration — office-hours activity on a
                            day the person marked as personal leave. */}
                        {a.on_leave_day && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                       text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: "rgba(255,201,60,0.14)",
                              color: "var(--tape)",
                            }}
                          >
                            On leave
                          </span>
                        )}
                      </div>

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

