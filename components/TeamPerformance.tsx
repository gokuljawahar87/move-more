// components/TeamPerformance.tsx
"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { CalendarDays, RotateCcw, Loader2, X } from "lucide-react";
import { teamLogo, teamName as canonicalTeam } from "@/lib/teams";

type Member = {
  name: string;
  run?: number | null;
  walk?: number | null;
  cycle?: number | null;
  run_km?: number | null;
  walk_km?: number | null;
  cycle_km?: number | null;
  points?: number | null;
};

type Team = {
  team?: string;
  teamName?: string;
  total_points?: number;
  totalPoints?: number;
  members: Member[];
};

export function TeamPerformance() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showOverall, setShowOverall] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  async function fetchTeams(date?: string, showAll?: boolean) {
    try {
      setLoading(true);
      let url = "/api/team-performance";
      if (date && !showAll) url += `?date=${date}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch team performance");
      const data = await res.json();

      const sorted = (data || [])
        .map((t: Team) => ({
          ...t,
          _points: t.total_points ?? t.totalPoints ?? 0,
        }))
        .sort((a: any, b: any) => b._points - a._points);

      setTeams(sorted);
    } catch (err) {
      console.error("Failed to load team performance:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeams(selectedDate, showOverall);
  }, [selectedDate, showOverall]);

  const rankColour = (rank: number) =>
    rank === 0
      ? "var(--gold)"
      : rank === 1
      ? "var(--silver)"
      : rank === 2
      ? "var(--bronze)"
      : "var(--ink-800)";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-tape" size={22} />
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="font-display uppercase tracking-wide text-lg">
          Nothing here yet
        </p>
        <p className="split text-chalk-dim mt-1">
          {showOverall
            ? "No team activity recorded."
            : "No activity on that date."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 space-y-3">
      {/* ── Mode switch ────────────────────────────────────────── */}
      <div className="bib px-3.5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays size={14} className="text-tape shrink-0" />
            <p className="eyebrow text-[9px] truncate">
              {showOverall ? "Season to date" : "Single day"}
            </p>
          </div>

          <button
            onClick={() => setShowOverall((v: boolean) => !v)}
            className="flex items-center gap-1.5 border border-ink-800 hover:border-tape
                       hover:text-tape text-chalk-dim px-3 py-1.5 rounded-lg
                       font-display font-600 uppercase tracking-[0.1em] text-[10px]
                       transition-colors shrink-0"
          >
            <RotateCcw size={11} />
            {showOverall ? "By day" : "Overall"}
          </button>
        </div>

        {!showOverall && (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSelectedDate(e.target.value)
              }
              className="flex-1 bg-ink-950 border border-ink-800 rounded-lg px-3 py-2
                         text-chalk text-sm focus:border-tape focus:outline-none
                         [color-scheme:dark]"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                aria-label="Clear date"
                className="p-2 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Teams ──────────────────────────────────────────────── */}
      {teams.map((team: Team, idx: number) => {
        const raw = team.team ?? team.teamName ?? "Unnamed Team";
        const label = canonicalTeam(raw);
        const logo = teamLogo(raw);
        const totalPoints = team.total_points ?? team.totalPoints ?? 0;

        // Sorted by points, so each team reads as its own ranking
        const members = [...(team.members ?? [])].sort(
          (a, b) => (b.points ?? 0) - (a.points ?? 0)
        );

        return (
          <div
            key={raw + idx}
            className="rounded-card overflow-hidden border"
            style={{
              backgroundColor: "var(--ink-900)",
              borderColor: rankColour(idx),
            }}
          >
            {/* Team header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-ink-800">
              <span
                className="bib-number text-[22px] w-6 text-center shrink-0"
                style={{
                  color: idx < 3 ? rankColour(idx) : "var(--chalk-dim)",
                }}
              >
                {idx + 1}
              </span>

              {logo && (
                <img
                  src={logo}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-ink-700 shrink-0"
                />
              )}

              <h2 className="font-display font-600 uppercase tracking-wide text-[15px] flex-1 min-w-0 truncate">
                {label}
              </h2>

              <span className="readout text-base text-tape shrink-0">
                {totalPoints.toFixed(0)}
                <span className="eyebrow text-[8px] ml-1">pts</span>
              </span>
            </div>

            {/* Members table — same structure as before, just recoloured.
                The discipline colours match the rest of the app, and the
                rate line sits under each heading as it always did. */}
            <table className="w-full border-collapse text-center">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="w-[28%] px-2 py-1.5 border-b border-r border-ink-800
                               font-display font-600 uppercase tracking-wider text-[10px] text-chalk-dim"
                  >
                    Name
                  </th>
                  <Head colour="var(--walk)">Walk</Head>
                  <Head colour="var(--cycle)">Cycle</Head>
                  <Head colour="var(--run)">Run</Head>
                  <th
                    rowSpan={2}
                    className="w-[18%] px-1 py-1.5 border-b border-ink-800
                               font-display font-600 uppercase tracking-wider text-[10px] text-chalk-dim"
                  >
                    Points
                  </th>
                </tr>
                <tr>
                  <Rate>14</Rate>
                  <Rate>6</Rate>
                  <Rate>22</Rate>
                </tr>
              </thead>

              <tbody>
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3">
                      <span className="split text-chalk-dim">
                        Nobody active yet.
                      </span>
                    </td>
                  </tr>
                )}

                {members.map((m: Member, i: number) => {
                  const run = m.run_km ?? m.run ?? 0;
                  const walk = m.walk_km ?? m.walk ?? 0;
                  const cycle = m.cycle_km ?? m.cycle ?? 0;
                  const points = m.points ?? 0;
                  const firstName = m.name?.split(" ")[0] ?? "";

                  return (
                    <tr
                      key={m.name + i}
                      className={points === 0 ? "opacity-45" : ""}
                      style={{
                        backgroundColor:
                          i % 2 === 1 ? "var(--ink-950)" : "transparent",
                      }}
                    >
                      <td className="px-2 py-2 border-r border-ink-800 text-sm truncate">
                        {firstName}
                      </td>
                      <Cell value={walk} colour="var(--walk)" />
                      <Cell value={cycle} colour="var(--cycle)" />
                      <Cell value={run} colour="var(--run)" />
                      <td className="px-1 py-2 readout text-sm">
                        {points.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function Head({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <th
      className="w-[18%] px-1 pt-1.5 border-r border-ink-800
                 font-display font-600 uppercase tracking-wider text-[10px]"
      style={{ color: colour }}
    >
      {children}
    </th>
  );
}

/** The points-per-km line under each discipline heading. */
function Rate({ children }: { children: ReactNode }) {
  return (
    <th className="px-1 pb-1.5 border-b border-r border-ink-800 split text-[9px] text-chalk-dim font-normal">
      {children}/km
    </th>
  );
}

/** A distance cell, dimmed at zero so the eye skips it. */
function Cell({ value, colour }: { value: number; colour: string }) {
  return (
    <td
      className="px-1 py-2 border-r border-ink-800 split text-[11px]"
      style={{ color: value > 0 ? colour : "var(--ink-700)" }}
    >
      {value.toFixed(1)}
    </td>
  );
}
