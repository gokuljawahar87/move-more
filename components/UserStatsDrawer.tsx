// components/UserStatsDrawer.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Loader2, Footprints, Bike, Activity } from "lucide-react";

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

  useEffect(() => {
    if (!isOpen || !userId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/stats?user_id=${userId}`);
        const data = await res.json();
        setStats(data);
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
