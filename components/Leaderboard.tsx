"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { teamLogo, teamName } from "@/lib/teams";

type LeaderboardEntry = {
  name?: string;
  team?: string;
  points?: number;
  streak?: number;
  active?: number;
  size?: number;
  rate?: number;
};

type LeaderboardData = {
  topScorers?: LeaderboardEntry[];
  topFemales?: LeaderboardEntry[];
  topMales?: LeaderboardEntry[];
  topStreaks?: LeaderboardEntry[];
  teams?: LeaderboardEntry[];
  participation?: LeaderboardEntry[];
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
        label="Top Teams"
        note="by points"
        list={data.teams || []}
        metric="points"
        unit="pts"
        accent="var(--tape)"
        isTeam
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
        label="Men's Podium"
        note="by points"
        list={data.topMales || []}
        metric="points"
        unit="pts"
        accent="var(--tape)"
      />
      <Section
        label="Longest Streaks"
        note="consecutive days"
        list={data.topStreaks || []}
        metric="streak"
        unit="days"
        accent="var(--run)"
      />

      {/* Participation is a SHARE of each team, not a headcount —
          teams differ in size, so counting active members outright
          would just rank the biggest teams highest. */}
      <Participation list={data.participation || []} />

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
  metric: "points" | "streak";
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
            const logo = teamLogo(item.team);

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
                    {isTeam ? teamName(item.team) : item.name}
                  </div>
                  {!isTeam && item.team && (
                    <div className="split text-chalk-dim truncate mt-0.5">
                      {teamName(item.team)}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="readout text-2xl"
                    style={{ color: accent }}
                  >
                    {metric === "streak"
                      ? Number(item[metric] ?? 0)
                      : Number(item[metric] ?? 0).toFixed(1)}
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

/** How many people from each team have logged something. */
function Participation({ list }: { list: LeaderboardEntry[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2.5 pb-2 border-b border-ink-800">
        <h2 className="font-display font-700 uppercase tracking-[0.08em] text-xl">
          Turnout
        </h2>
        <span className="split text-chalk-dim">members moving</span>
      </div>

      {list.length > 0 ? (
        <div className="space-y-2">
          {list.map((t, i) => {
            const rank = i + 1;
            const logo = teamLogo(t.team);
            const active = t.active ?? 0;
            const size = t.size ?? 0;
            const pct = size > 0 ? Math.round((active / size) * 100) : 0;

            return (
              <div
                key={t.team ?? i}
                className={`bib bib-${rank} px-3.5 pt-4 pb-3 animate-bib-in`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3.5">
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
                      {teamName(t.team)}
                    </div>
                    <div className="split text-chalk-dim mt-0.5">
                      of {t.size} registered · {pct}%
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="readout text-2xl text-walk">{active}</span>
                    <span className="eyebrow text-[9px] ml-1">
                      {active === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>

                {/* The bar shows the SHARE of the team that's moving.
                    Ranking is still by headcount — scaling the bar to the
                    leader instead made 4-of-5 and 4-of-8 both look full. */}
                <div className="mt-2.5 h-1.5 w-full rounded-full overflow-hidden bg-ink-800">
                  <div
                    className="h-full bg-walk transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bib px-4 pt-5 pb-4 text-center">
          <p className="split text-chalk-dim">Nobody moving yet.</p>
        </div>
      )}
    </section>
  );
}
