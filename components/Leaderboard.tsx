"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type LeaderboardEntry = {
  name?: string;
  team?: string;
  run?: number;
  walk?: number;
  cycle?: number;
  points?: number;
};

type LeaderboardData = {
  runners: LeaderboardEntry[];
  walkers: LeaderboardEntry[];
  cyclers: LeaderboardEntry[];
  teams: LeaderboardEntry[];
  topFemales?: LeaderboardEntry[];
};

// ⚠️ Season 2: replace these with the new team names and logo files.
const teamLogos: Record<string, string> = {
  "THE POWERHOUSE": "/logos/powerhouse.png",
  "Corporate Crusaders": "/logos/crusaders.png",
  "RAC ROCKERS": "/logos/rockers.png",
  "ALPHA SQUAD": "/logos/alpha.png",
  "Black Forest Brigade": "/logos/brigade.png",
  RACKETS: "/logos/rackets.png",
  "VIBE TRIBE": "/logos/vibe.png",
  GOAT: "/logos/goat.png",
};

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="p-8 text-center">
        <p className="font-display uppercase tracking-wide text-lg">
          Ranks unavailable
        </p>
        <p className="text-sm text-chalk-dim mt-1">
          The leaderboard didn&apos;t load. Pull down to try again.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-tape" size={22} />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-8">
      <Section
        label="Runners"
        note="by distance"
        list={data.runners}
        metric="run"
        unit="km"
        accent="var(--run)"
      />
      <Section
        label="Walkers"
        note="by distance"
        list={data.walkers}
        metric="walk"
        unit="km"
        accent="var(--walk)"
      />
      <Section
        label="Cyclists"
        note="by distance"
        list={data.cyclers}
        metric="cycle"
        unit="km"
        accent="var(--cycle)"
      />
      <Section
        label="Women's Podium"
        note="by points"
        list={data.topFemales || []}
        metric="points"
        unit="pts"
        accent="var(--tape)"
      />
      <Section
        label="Teams"
        note="by points"
        list={data.teams}
        metric="points"
        unit="pts"
        accent="var(--tape)"
        isTeam
      />
    </div>
  );
}

function Section({
  label,
  note,
  list,
  metric,
  unit,
  accent,
  isTeam = false,
}: {
  label: string;
  note: string;
  list: LeaderboardEntry[];
  metric: "run" | "walk" | "cycle" | "points";
  unit: string;
  accent: string;
  isTeam?: boolean;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2.5 pb-2 border-b border-ink-800">
        <h2 className="font-display font-700 uppercase tracking-[0.08em] text-xl">
          {label}
        </h2>
        <span className="split text-chalk-dim">{note}</span>
      </div>

      {list && list.length > 0 ? (
        <div className="space-y-2">
          {list.map((item, i) => {
            const rank = i + 1;
            const logo = item.team ? teamLogos[item.team] : null;

            return (
              <div
                key={i}
                className={`bib bib-${rank} flex items-center gap-3.5 pl-3.5 pr-4 pt-4 pb-3 animate-bib-in`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Bib number — the signature element */}
                <div
                  className="bib-number w-9 shrink-0 text-center"
                  style={{
                    color:
                      rank === 1
                        ? "var(--gold)"
                        : rank === 2
                        ? "var(--silver)"
                        : "var(--bronze)",
                  }}
                >
                  {rank}
                </div>

                {logo && (
                  <img
                    src={logo}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-ink-700 shrink-0"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-display font-600 uppercase tracking-wide text-[17px] leading-tight truncate">
                    {isTeam ? item.team : item.name}
                  </div>
                  {!isTeam && item.team && (
                    <div className="split text-chalk-dim truncate mt-0.5">
                      {item.team}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="readout text-2xl"
                    style={{ color: accent }}
                  >
                    {Number(item[metric] ?? 0).toFixed(1)}
                  </span>
                  <span className="eyebrow text-[9px] ml-1">{unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bib px-4 pt-5 pb-4 text-center">
          <p className="split text-chalk-dim">
            Nobody on the board yet — first one here takes it.
          </p>
        </div>
      )}
    </section>
  );
}
