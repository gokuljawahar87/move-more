// lib/milestones.ts
//
// Milestones are worked out from each person's own totals — nothing is
// stored except the fact that they've seen the celebration.
//
// Deliberately sparse. An earlier version fired at a dozen thresholds
// and would have interrupted people constantly; these are spaced so a
// popup stays worth reading.
//
//   Walking   every 50 km
//   Running   every 50 km
//   Cycling   every 100 km
//
// Streaks and points were dropped on purpose. Enough people sustain a
// streak or pass a points threshold that recognising them would fire
// constantly — and a popup everyone sees several times a day stops
// being recognition and becomes noise. Distance milestones are rarer
// and land better.

export type Milestone = {
  id: string;
  metric: "run" | "walk" | "cycle";
  threshold: number;
  title: string;
  body: string;
  /** Shown above the title */
  kicker: string;
};

const KICKERS: Record<Milestone["metric"], string> = {
  walk: "Walking milestone",
  run: "Running milestone",
  cycle: "Cycling milestone",
};

/** Copy for each rung. Later rungs fall back to the last line given. */
const COPY: Record<Milestone["metric"], string[]> = {
  walk: [
    "Fifty kilometres walked. Roughly Chennai to Mahabalipuram, one step at a time.",
    "A hundred kilometres on foot. Whatever you were doing before this season, you're not doing it any more.",
    "A hundred and fifty kilometres walked.",
    "Two hundred kilometres. That is a genuinely enormous amount of walking.",
    "Two hundred and fifty kilometres on foot.",
    "Further than most people manage in a year.",
  ],
  run: [
    "Fifty kilometres of running behind you. More than a marathon's worth.",
    "A hundred kilometres run this season.",
    "A hundred and fifty kilometres. You've stopped being someone who runs occasionally.",
    "Two hundred kilometres run.",
    "Two hundred and fifty kilometres.",
    "There isn't much left to say about this one.",
  ],
  cycle: [
    "A hundred kilometres ridden. A proper century in the making.",
    "Two hundred kilometres on the bike.",
    "Three hundred kilometres ridden this season.",
    "Four hundred kilometres. That's Chennai to Bangalore.",
    "You've ridden a very long way indeed.",
  ],
};

function build(
  metric: Milestone["metric"],
  step: number,
  count: number,
  titleFor: (n: number) => string
): Milestone[] {
  return Array.from({ length: count }, (_, i) => {
    const threshold = step * (i + 1);
    const lines = COPY[metric];
    return {
      id: `${metric}-${threshold}`,
      metric,
      threshold,
      title: titleFor(threshold),
      body: lines[Math.min(i, lines.length - 1)],
      kicker: KICKERS[metric],
    };
  });
}

export const MILESTONES: Milestone[] = [
  ...build("walk", 50, 6, (n) => `${n} km on foot`),
  ...build("run", 50, 6, (n) => `${n} km running`),
  ...build("cycle", 100, 6, (n) => `${n} km on the bike`),
];

export type MilestoneStats = {
  run: number;
  walk: number;
  cycle: number;
};

/**
 * Every milestone these totals have passed, freshest first.
 *
 * Sorted by how narrowly each was cleared, not by raw threshold —
 * comparing 3,000 points against 200 km is comparing different units,
 * and would always crown the points one. The milestone someone has
 * only just passed is the one worth celebrating.
 */
export function earnedMilestones(stats: MilestoneStats): Milestone[] {
  return MILESTONES.filter((ms) => stats[ms.metric] >= ms.threshold).sort(
    (a, b) => stats[a.metric] / a.threshold - stats[b.metric] / b.threshold
  );
}
