// components/UserStatsDrawer.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Loader2, Footprints, Bike, Activity, Flame, CalendarPlus, Check } from "lucide-react";

interface UserStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function UserStatsDrawer({
  isOpen,
  onClose,
  userId,
}: UserStatsDrawerProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [leaveDays, setLeaveDays] = useState<string[]>([]);
  const [today, setToday] = useState<string>("");
  const [savingLeave, setSavingLeave] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/stats?user_id=${userId}`);
        const data = await res.json();
        setStats(data);

        const lv = await fetch("/api/leave").then((r) => r.json());
        setLeaveDays(lv.days ?? []);
        setToday(lv.today ?? "");
      } catch (err) {
        console.error("Failed to fetch user stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, userId]);

  const walk = stats?.walkKm ?? 0;
  const run = stats?.runKm ?? 0;
  const cycle = stats?.cycleKm ?? 0;
  const total = walk + run + cycle;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed top-0 left-0 w-[86vw] max-w-[340px] h-full z-50 overflow-y-auto border-r border-ink-800"
            style={{ backgroundColor: "var(--ink-950)" }}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-6 pb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="eyebrow text-[10px]">Your season</p>
                  <h2 className="font-display font-700 uppercase text-2xl leading-tight mt-0.5">
                    Race Card
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 -mr-1.5 -mt-1 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-tape" size={20} />
                </div>
              ) : stats ? (
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
                            if (r.ok) setLeaveDays((d) => [...d, today]);
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

                  {/* Personal bests */}
                  <p className="eyebrow text-[9px] mb-2">Longest efforts</p>
                  <div className="space-y-2">
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

                  {total === 0 && (
                    <p className="split text-chalk-dim text-center mt-6">
                      Nothing logged yet. Your first one counts double in
                      spirit.
                    </p>
                  )}
                </>
              ) : (
                <p className="split text-chalk-dim text-center mt-12">
                  No stats available.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
    <div className="bib flex items-center gap-3 px-3.5 pt-4 pb-3">
      <Icon size={15} style={{ color: colour }} strokeWidth={2} />
      <span className="eyebrow text-[9px] flex-1">{label}</span>
      <span className="readout text-base" style={{ color: km ? colour : undefined }}>
        {km ? `${km.toFixed(1)} km` : "—"}
      </span>
    </div>
  );
}
