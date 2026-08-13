// components/Stats.tsx
"use client";

import { Footprints, Bike, Activity, TreePine, Waves } from "lucide-react";

interface StatsProps {
  total_distance: number; // km
  cycling_distance: number; // km
  running_distance: number; // km
  walking_distance: number; // km
}

export default function Stats({
  total_distance,
  cycling_distance,
  running_distance,
  walking_distance,
}: StatsProps) {
  const total = Number(total_distance) || 0;
  const run = Number(running_distance) || 0;
  const walk = Number(walking_distance) || 0;
  const cycle = Number(cycling_distance) || 0;

  const steps = Math.round(walk * 1312);
  const co2 = total * 0.21;

  // A 400 m track lap — turns an abstract number into something you can
  // picture. Works at any scale, unlike a fixed landmark comparison.
  const laps = Math.round((total * 1000) / 400);

  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="space-y-4">
      {/* ── HERO: total distance ────────────────────────────────
          The single most impressive number in the app, set at the
          scale it deserves. */}
      <div className="bib px-5 pt-7 pb-5">
        <p className="eyebrow text-[10px]">Distance covered together</p>

        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="readout text-[64px] leading-[0.85] text-tape">
            {total.toFixed(1)}
          </span>
          <span className="font-display font-600 uppercase tracking-[0.16em] text-lg text-chalk-dim">
            km
          </span>
        </div>

        {/* Split bar — one lane, three colours, proportional */}
        <div className="mt-5 h-2.5 w-full rounded-full overflow-hidden bg-ink-800 flex">
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${pct(run)}%`, backgroundColor: "var(--run)" }}
          />
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${pct(walk)}%`, backgroundColor: "var(--walk)" }}
          />
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${pct(cycle)}%`, backgroundColor: "var(--cycle)" }}
          />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          <Key colour="var(--run)" label="Run" value={run} />
          <Key colour="var(--walk)" label="Walk" value={walk} />
          <Key colour="var(--cycle)" label="Cycle" value={cycle} />
        </div>

        {laps > 0 && (
          <p className="split text-chalk-dim mt-4 pt-3 border-t border-ink-800">
            {laps.toLocaleString("en-IN")} laps of a 400 m track
          </p>
        )}
      </div>

      {/* ── Breakdown ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Run"
          value={run.toFixed(1)}
          unit="km"
          colour="var(--run)"
          Icon={Activity}
        />
        <Metric
          label="Walk"
          value={walk.toFixed(1)}
          unit="km"
          colour="var(--walk)"
          Icon={Footprints}
        />
        <Metric
          label="Cycle"
          value={cycle.toFixed(1)}
          unit="km"
          colour="var(--cycle)"
          Icon={Bike}
        />
      </div>

      {/* ── Side effects of all that moving ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Steps taken"
          value={steps.toLocaleString("en-IN")}
          unit=""
          colour="var(--chalk)"
          Icon={Waves}
        />
        <Metric
          label="CO₂ not burned"
          value={co2.toFixed(1)}
          unit="kg"
          colour="var(--walk)"
          Icon={TreePine}
        />
      </div>
    </div>
  );
}

function Key({
  colour,
  label,
  value,
}: {
  colour: string;
  label: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colour }}
      />
      <span className="eyebrow text-[9px]">{label}</span>
      <span className="split text-chalk">{value.toFixed(1)}</span>
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
  colour,
  Icon,
}: {
  label: string;
  value: string;
  unit: string;
  colour: string;
  Icon: typeof Footprints;
}) {
  return (
    <div className="bib px-3.5 pt-5 pb-3.5">
      <Icon size={15} style={{ color: colour }} strokeWidth={2} />
      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="readout text-[26px] leading-none" style={{ color: colour }}>
          {value}
        </span>
        {unit && <span className="eyebrow text-[9px]">{unit}</span>}
      </div>
      <p className="eyebrow text-[9px] mt-1.5">{label}</p>
    </div>
  );
}
