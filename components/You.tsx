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
  Undo2,
  Scale,
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
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetch("/api/profile").then((r) => r.json());
        setProfile(p);

        if (p?.user_id) {
          const [s, lv, g, w] = await Promise.all([
            fetch(`/api/user/stats?user_id=${p.user_id}`).then((r) => r.json()),
            fetch("/api/leave").then((r) => r.json()),
            fetch("/api/challenges").then((r) => r.json()),
            fetch("/api/weight/get").then((r) => r.json()),
          ]);
          setStats(s);
          setLeaveDays(lv.days ?? []);
          setToday(lv.today ?? "");
          setGoals(g);
          setWeights(w.entries ?? []);
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

              {/* Only shown once it has actually bitten — explaining a
                  cap to someone who has never hit it is just noise. */}
              {(stats.daysAtCap ?? 0) > 0 && (
                <p className="split text-chalk-dim pt-2.5 border-t border-ink-800 leading-relaxed">
                  You hit the {stats.dailyCap ?? 175}-point daily cap on{" "}
                  <span className="text-tape">
                    {stats.daysAtCap} {stats.daysAtCap === 1 ? "day" : "days"}
                  </span>
                  . Your kilometres still count in full — the cap only
                  limits what one person adds to the team in a day.
                </p>
              )}
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
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <Check size={14} className="text-walk" strokeWidth={3} />
                    <span className="font-display font-600 uppercase tracking-wide text-sm text-walk truncate">
                      Today marked as leave
                    </span>
                  </span>

                  {/* Undo — people mark it to see what it does, and
                      without this they were stuck with it. */}
                  <button
                    disabled={savingLeave}
                    onClick={async () => {
                      setSavingLeave(true);
                      try {
                        const r = await fetch("/api/leave", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ leave_date: today }),
                        });
                        if (r.ok) {
                          setLeaveDays((d: string[]) =>
                            d.filter((x) => x !== today)
                          );
                        }
                      } finally {
                        setSavingLeave(false);
                      }
                    }}
                    className="flex items-center gap-1 text-chalk-dim hover:text-run
                               font-display font-600 uppercase tracking-[0.1em]
                               text-[10px] transition-colors shrink-0 disabled:opacity-50"
                  >
                    <Undo2 size={11} />
                    Undo
                  </button>
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

            
            {/* ── Weight trend ──────────────────────────────────
                Last section on the page. Private to the person — it
                appears on no leaderboard and in no team view. */}
            <WeightTrend entries={weights} />

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

/**
 * A plain line of the last 12 weigh-ins.
 *
 * Deliberately unopinionated: no target line, no BMI, no colour coding
 * of "good" and "bad" directions. It shows the shape of the data and
 * leaves the interpretation to the person it belongs to.
 */
function WeightTrend({ entries }: { entries: { date: string; weight: number }[] }) {
  if (!entries.length) {
    return (
      <div className="bib px-4 pt-5 pb-4 mb-4">
        <div className="flex items-center gap-1.5">
          <Scale size={13} className="text-tape" strokeWidth={2.2} />
          <p className="eyebrow text-[9px]">Weight</p>
        </div>
        <p className="split text-chalk-dim mt-2.5 leading-relaxed">
          Nothing logged yet. Tap the scales in the top bar to add your
          first entry — only you can see it.
        </p>
      </div>
    );
  }

  const shown = entries.slice(-12);
  const values = shown.map((e) => e.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat line would divide by zero, so give it a little headroom
  const span = max - min || 1;

  const W = 300;
  const H = 84;
  const pad = 8;
  // Headroom so the first point's label isn't clipped
  const padTop = 16;
  // Extra room on the right so the last value's label isn't clipped
  const padRight = 38;

  const points = shown.map((e, i) => {
    const x =
      shown.length === 1
        ? W / 2
        : pad + (i / (shown.length - 1)) * (W - pad - padRight);
    const y = padTop + (1 - (e.weight - min) / span) * (H - padTop - pad);
    return { x, y, ...e };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const latest = values[values.length - 1];
  const first = values[0];
  const change = latest - first;

  return (
    <div className="bib px-4 pt-5 pb-4 mb-4">
      <div className="flex items-center gap-1.5">
        <Scale size={13} className="text-tape" strokeWidth={2.2} />
        <p className="eyebrow text-[9px]">Weight</p>
      </div>

      <div className="flex items-end justify-between mt-2.5">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="readout text-[34px] leading-none text-tape">
              {latest.toFixed(1)}
            </span>
            <span className="eyebrow text-[9px]">kg</span>
          </div>
          {/* Labelled, because sitting above the chart's left edge it
              otherwise reads as the starting weight. */}
          <p className="eyebrow text-[8px] mt-1.5">Latest</p>
        </div>

        {shown.length > 1 && (
          <div className="text-right">
            <span className="readout text-base text-chalk-dim">
              {change > 0 ? "+" : ""}
              {change.toFixed(1)} kg
            </span>
            <p className="eyebrow text-[8px] mt-1">
              from {first.toFixed(1)} kg
            </p>
          </div>
        )}
      </div>

      {shown.length > 1 && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[86px] mt-3"
          preserveAspectRatio="none"
          role="img"
          aria-label="Your weight over time"
        >
          <path
            d={path}
            fill="none"
            stroke="var(--tape)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 3 : 2}
              fill={
                i === points.length - 1 ? "var(--tape)" : "var(--ink-900)"
              }
              stroke="var(--tape)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* First and last readings, so the change is readable on the
              chart itself. CSS variables don't resolve in SVG
              presentation attributes, so the font goes via style. */}
          <text
            x={points[0].x}
            y={points[0].y - 7}
            fill="var(--chalk-dim)"
            fontSize="10"
            textAnchor="start"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {first.toFixed(1)}
          </text>

          <text
            x={points[points.length - 1].x + 7}
            y={points[points.length - 1].y + 3.5}
            fill="var(--tape)"
            fontSize="11"
            fontWeight="700"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {latest.toFixed(1)}
          </text>
        </svg>
      )}

      <div className="flex justify-between mt-2 pt-2.5 border-t border-ink-800">
        <span className="split text-chalk-dim">
          {new Date(`${shown[0].date}T12:00:00+05:30`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <span className="split text-chalk-dim">
          {shown.length} {shown.length === 1 ? "entry" : "entries"}
        </span>
        <span className="split text-chalk-dim">
          {new Date(
            `${shown[shown.length - 1].date}T12:00:00+05:30`
          ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}
