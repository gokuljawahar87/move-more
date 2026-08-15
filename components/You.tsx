// components/You.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Footprints,
  Bike,
  Activity,
  Flame,
  CalendarPlus,
  Check,
  TrendingUp,
  Target,
} from "lucide-react";
import { teamLogo, teamName } from "@/lib/teams";

/**
 * The landing page: everything about you in one place.
 *
 * Previously a side drawer behind a hamburger, which meant most people
 * never opened it. It's the densest and most personal screen in the
 * app, so it earns being the first thing you land on.
 */
export default function You() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveDays, setLeaveDays] = useState<string[]>([]);
  const [today, setToday] = useState<string>("");
  const [savingLeave, setSavingLeave] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetch("/api/profile").then((r) => r.json());
        setProfile(p);

        if (p?.user_id) {
          const [s, lv, g] = await Promise.all([
            fetch(`/api/user/stats?user_id=${p.user_id}`).then((r) => r.json()),
            fetch("/api/leave").then((r) => r.json()),
            fetch("/api/challenges").then((r) => r.json()),
          ]);
          setStats(s);
          setLeaveDays(lv.days ?? []);
          setToday(lv.today ?? "");
          setGoals(g);
        }
      } catch (err) {
        console.error("Failed to load your page:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const walk = stats?.walkKm ?? 0;
  const run = stats?.runKm ?? 0;
  const cycle = stats?.cycleKm ?? 0;
  const total = walk + run + cycle;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-tape" size={22} />
      </div>
    );
  }

  const logo = teamLogo(profile?.team);
  const todaysGoals = goals?.challenges ?? [];
  const goalsDone = todaysGoals.filter((c: any) => c.completed).length;

  return (
    <div className="px-4 py-5">
      {/* ── Welcome ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 mb-5">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="w-14 h-14 rounded-full object-cover ring-1 ring-ink-700 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-tape text-ink-950 flex items-center justify-center font-display font-700 text-lg shrink-0">
            {`${profile?.first_name?.[0] ?? ""}${
              profile?.last_name?.[0] ?? ""
            }`.toUpperCase() || "—"}
          </div>
        )}

        <div className="min-w-0">
          <p className="eyebrow text-[9px]">Welcome</p>
          <h1 className="font-display font-700 uppercase tracking-wide text-[22px] leading-tight truncate">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="split text-tape truncate">{teamName(profile?.team)}</p>
        </div>
      </div>

      {stats ? (
        <>
{/* Total distance */}
            <div className="bib px-4 pt-6 pb-4 mb-4">
              <p className="eyebrow text-[9px]">Distance covered</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="readout text-[44px] leading-none text-tape">
                  {total.toFixed(1)}
                </span>
                <span className="eyebrow text-[10px]">km</span>
              </div>

              {/* Split bar — replaces the pie chart. Same lane
                  treatment used on the Stats page, and it drops
                  chart.js entirely. */}
              <div className="mt-4 h-2 w-full rounded-full overflow-hidden bg-ink-800 flex">
                <div
                  className="h-full"
                  style={{
                    width: `${pct(run)}%`,
                    backgroundColor: "var(--run)",
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${pct(walk)}%`,
                    backgroundColor: "var(--walk)",
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${pct(cycle)}%`,
                    backgroundColor: "var(--cycle)",
                  }}
                />
              </div>

              <div className="mt-3 space-y-1.5">
                <Split
                  colour="var(--run)"
                  label="Run"
                  km={run}
                  pct={pct(run)}
                />
                <Split
                  colour="var(--walk)"
                  label="Walk"
                  km={walk}
                  pct={pct(walk)}
                />
                <Split
                  colour="var(--cycle)"
                  label="Cycle"
                  km={cycle}
                  pct={pct(cycle)}
                />
              </div>
            </div>

            {/* Personal bests — one card with three rows, rather than
                three separate cards for what is really one idea. */}
            <div className="bib px-4 pt-5 pb-4 mb-4">
              <p className="eyebrow text-[9px]">Longest efforts</p>

              <div className="mt-3 divide-y divide-ink-800">
                <Best
                  Icon={Activity}
                  colour="var(--run)"
                  label="Run"
                  km={stats.longestRun}
                />
                <Best
                  Icon={Footprints}
                  colour="var(--walk)"
                  label="Walk"
                  km={stats.longestWalk}
                />
                <Best
                  Icon={Bike}
                  colour="var(--cycle)"
                  label="Cycle"
                  km={stats.longestCycle}
                />
              </div>
            </div>

            {/* 🔥 Streak — a streak day is one activity of 30+
                minutes, outside office hours. */}
            <div className="bib px-4 pt-6 pb-4 mb-4">
              <div className="flex items-center gap-1.5">
                <Flame
                  size={13}
                  className={
                    stats.currentStreak > 0 ? "text-tape" : "text-chalk-dim"
                  }
                  strokeWidth={2.2}
                />
                <p className="eyebrow text-[9px]">Streak</p>
              </div>

              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="readout text-[40px] leading-none"
                      style={{
                        color:
                          stats.currentStreak > 0
                            ? "var(--tape)"
                            : "var(--chalk-dim)",
                      }}
                    >
                      {stats.currentStreak ?? 0}
                    </span>
                    <span className="eyebrow text-[9px]">
                      {stats.currentStreak === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <p className="split text-chalk-dim mt-1">
                    {stats.currentStreak > 0
                      ? stats.todayDone
                        ? "Logged today"
                        : "Today still open"
                      : "No active streak"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="readout text-xl block leading-none">
                    {stats.maxStreak ?? 0}
                  </span>
                  <p className="eyebrow text-[9px] mt-1">Best</p>
                </div>
              </div>

              <p className="split text-chalk-dim mt-3 pt-3 border-t border-ink-800">
                30+ min in one activity, outside office hours
              </p>
            </div>

            {/* Standings */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat
                label="Overall"
                value={stats.overallRank ? `${stats.overallRank}` : "—"}
                suffix={
                  stats.totalParticipants
                    ? `of ${stats.totalParticipants}`
                    : undefined
                }
                big
              />
              <Stat
                label="In team"
                value={stats.teamRank ? `${stats.teamRank}` : "—"}
                big
              />
            </div>

            <div className="bib px-4 pt-5 pb-4 mb-4 space-y-2.5">
              <Row label="Points" value={Math.round(stats.totalPoints ?? 0)} />
              <Row label="Activities" value={stats.totalActivities ?? 0} />
              <Row label="Active days" value={stats.activeDays ?? 0} />
            </div>

          {/* ── Today's goals ──────────────────────────────────
              A nudge toward the Weekly tab: what's on today and how
              much of it is done. */}
          {todaysGoals.length > 0 && (
            <div className="bib px-4 pt-5 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Target size={13} className="text-tape" strokeWidth={2.2} />
                  <p className="eyebrow text-[9px]">Today&apos;s goals</p>
                </div>
                <span className="split text-chalk-dim">
                  {goalsDone} of {todaysGoals.length}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {todaysGoals.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        c.completed ? "bg-walk" : "border border-ink-700"
                      }`}
                    >
                      {c.completed && (
                        <Check size={10} className="text-ink-950" strokeWidth={3.5} />
                      )}
                    </span>
                    <span
                      className={`text-sm flex-1 truncate ${
                        c.completed ? "text-chalk" : "text-chalk-dim"
                      }`}
                    >
                      {c.title}
                    </span>
                    <span className="split text-chalk-dim shrink-0">
                      {c.points}
                    </span>
                  </div>
                ))}
              </div>

              {goals?.cleanSweep && (
                <p className="split text-walk mt-3 pt-3 border-t border-ink-800">
                  Clean sweep — all done, +{goals.cleanSweepPoints} bonus.
                </p>
              )}
            </div>
          )}

            {/* ── Week vs week ───────────────────────────────
                Two totals and the gap between them. Sunday's
                challenge is simply to finish the week ahead of
                last week's number. */}
            <div className="bib px-4 pt-5 pb-4 mb-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={13} className="text-tape" strokeWidth={2.2} />
                <p className="eyebrow text-[9px]">Week on week</p>
              </div>

              <div className="flex items-end justify-between mt-3">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="readout text-[34px] leading-none text-tape">
                      {(stats.thisWeekKm ?? 0).toFixed(1)}
                    </span>
                    <span className="eyebrow text-[9px]">km</span>
                  </div>
                  <p className="eyebrow text-[9px] mt-1.5">This week</p>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="readout text-[22px] leading-none text-chalk-dim">
                      {(stats.lastWeekKm ?? 0).toFixed(1)}
                    </span>
                    <span className="eyebrow text-[9px]">km</span>
                  </div>
                  <p className="eyebrow text-[9px] mt-1.5">Last week</p>
                </div>
              </div>

              {/* How far along, as a bar against last week's total */}
              <div className="mt-3 h-2 w-full rounded-full overflow-hidden bg-ink-800">
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.lastWeekKm ?? 0) > 0
                        ? ((stats.thisWeekKm ?? 0) / stats.lastWeekKm) * 100
                        : (stats.thisWeekKm ?? 0) > 0
                        ? 100
                        : 0
                    )}%`,
                    backgroundColor:
                      (stats.thisWeekKm ?? 0) > (stats.lastWeekKm ?? 0)
                        ? "var(--walk)"
                        : "var(--tape)",
                  }}
                />
              </div>

              <p className="split text-chalk-dim mt-2.5 leading-relaxed">
                {(stats.lastWeekKm ?? 0) <= 0 ? (
                  "No distance last week — anything you do this week beats it."
                ) : (stats.thisWeekKm ?? 0) > (stats.lastWeekKm ?? 0) ? (
                  <>
                    You&apos;re{" "}
                    <span className="text-walk">
                      {((stats.thisWeekKm ?? 0) - stats.lastWeekKm).toFixed(1)} km
                    </span>{" "}
                    ahead of last week.
                  </>
                ) : (
                  <>
                    <span className="text-tape">
                      {(stats.lastWeekKm - (stats.thisWeekKm ?? 0)).toFixed(1)} km
                    </span>{" "}
                    to go to beat last week.
                  </>
                )}
              </p>
            </div>

            {/* ── Personal leave ──────────────────────────────
                Office hours are excluded from scoring. Marking a
                leave day lifts that, and shows an "On leave" tag
                on the activity for everyone to see. */}
            <div className="bib px-4 pt-5 pb-4 mb-4">
              <p className="eyebrow text-[9px]">Personal leave</p>
              <p className="split text-chalk-dim mt-1.5 leading-relaxed">
                Off work today? Mark it and your daytime activity will
                count. It shows publicly on your activity.
              </p>

              {leaveDays.includes(today) ? (
                <div className="mt-3 flex items-center gap-2">
                  <Check size={14} className="text-walk" strokeWidth={3} />
                  <span className="font-display font-600 uppercase tracking-wide text-sm text-walk">
                    Today marked as leave
                  </span>
                </div>
              ) : (
                <button
                  disabled={savingLeave || !today}
                  onClick={async () => {
                    setSavingLeave(true);
                    try {
                      const r = await fetch("/api/leave", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ leave_date: today }),
                      });
                      const j = await r.json();
                      if (r.ok) setLeaveDays((d: string[]) => [...d, today]);
                      else alert(j.error ?? "Could not mark leave");
                    } finally {
                      setSavingLeave(false);
                    }
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2
                             border border-ink-800 hover:border-tape hover:text-tape
                             text-chalk-dim py-2.5 rounded-lg font-display font-600
                             uppercase tracking-[0.1em] text-[12px] transition-colors
                             disabled:opacity-50"
                >
                  <CalendarPlus size={14} />
                  {savingLeave ? "Marking…" : "Mark today as leave"}
                </button>
              )}

              {leaveDays.length > 0 && (
                <p className="split text-chalk-dim mt-3 pt-3 border-t border-ink-800">
                  {leaveDays.length} leave{" "}
                  {leaveDays.length === 1 ? "day" : "days"} this season
                </p>
              )}
            </div>

            
          {total === 0 && (
            <p className="split text-chalk-dim text-center mt-6">
              Nothing logged yet. Your first one counts double in spirit.
            </p>
          )}
        </>
      ) : (
        <p className="split text-chalk-dim text-center mt-12">
          No stats available.
        </p>
      )}
    </div>
  );
}

function Split({
  colour,
  label,
  km,
  pct,
}: {
  colour: string;
  label: string;
  km: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colour }}
      />
      <span className="eyebrow text-[9px] flex-1">{label}</span>
      <span className="split text-chalk">{km.toFixed(1)} km</span>
      <span className="split text-chalk-dim w-11 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  big = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  big?: boolean;
}) {
  return (
    <div className="bib px-3.5 pt-5 pb-3.5">
      <p className="eyebrow text-[9px]">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`readout ${big ? "text-[30px]" : "text-xl"} leading-none`}>
          {value}
        </span>
        {suffix && <span className="split text-chalk-dim">{suffix}</span>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="eyebrow text-[9px]">{label}</span>
      <span className="readout text-lg">{value}</span>
    </div>
  );
}

function Best({
  Icon,
  colour,
  label,
  km,
}: {
  Icon: typeof Footprints;
  colour: string;
  label: string;
  km?: number | null;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <Icon size={15} style={{ color: colour }} strokeWidth={2} />
      <span className="eyebrow text-[9px] flex-1">{label}</span>
      <span
        className="readout text-base"
        style={{ color: km ? colour : undefined }}
      >
        {km ? `${km.toFixed(1)} km` : "—"}
      </span>
    </div>
  );
}
