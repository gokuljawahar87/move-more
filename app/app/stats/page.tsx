// app/app/stats/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import Stats from "@/components/Stats";
import { SEASON, getSeasonStatus } from "@/lib/season";

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [globalTotals, setGlobalTotals] = useState({
    total_distance: 0,
    cycling_distance: 0,
    running_distance: 0,
    walking_distance: 0,
    total_participants: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        fetch("/api/sync-status")
          .then((r) => r.json())
          .then((d) => setLastSync(d.lastRefreshedAt ?? null))
          .catch(() => {});

        const perfRes = await fetch("/api/team-performance");
        const perfJson = await perfRes.json();
        const teams = Array.isArray(perfJson) ? perfJson : perfJson?.teams ?? [];

        let run = 0,
          walk = 0,
          cycle = 0;

        const participantSet = new Set<string>();

        teams.forEach((team: any) => {
          (team.members || []).forEach((m: any) => {
            walk += m.walk || 0;
            run += m.run || 0;
            cycle += m.cycle || 0;
            if ((m.walk || m.run || m.cycle) > 0) participantSet.add(m.name);
          });
        });

        setGlobalTotals({
          total_distance: walk + run + cycle,
          walking_distance: walk,
          running_distance: run,
          cycling_distance: cycle,
          total_participants: participantSet.size,
        });
      } catch (err) {
        console.error("StatsPage error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const status = getSeasonStatus();
  const movers = globalTotals.total_participants;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-tape" size={22} />
      </div>
    );
  }

  return (
    <main className="px-4 py-6 space-y-4">
      {/* ── Masthead ──────────────────────────────────────────── */}
      <div className="text-center pb-1">
        <p className="eyebrow text-[10px]">
          Season {String(SEASON.number).padStart(2, "0")}
          {status.phase === "live" && ` · Day ${status.dayNumber}`}
        </p>
        <h1 className="font-display font-700 uppercase leading-[0.9] tracking-tight text-[34px] mt-1">
          The Numbers
          <br />
          So Far
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="h-px w-8 bg-ink-700" />
          <span className="font-display font-600 uppercase tracking-[0.2em] text-tape text-[11px]">
            Move-Athon Mania
          </span>
          <span className="h-px w-8 bg-ink-700" />
        </div>
      </div>

      {/* ── Movers ────────────────────────────────────────────── */}
      <div className="bib flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="eyebrow text-[10px]">
            {movers === 1 ? "Mover on the board" : "Movers on the board"}
          </p>
          <span className="readout text-[40px] leading-none block mt-1">
            {movers}
          </span>
        </div>
        <Users size={26} className="text-tape" strokeWidth={1.8} />
      </div>

      <Stats
        total_distance={globalTotals.total_distance}
        cycling_distance={globalTotals.cycling_distance}
        running_distance={globalTotals.running_distance}
        walking_distance={globalTotals.walking_distance}
      />

      {/* When the data was last pulled from Strava. Worth showing:
          people wonder why an activity hasn't appeared yet, and this
          answers it without them having to ask. */}
      <p className="split text-chalk-dim text-center pt-2">
        {lastSync
          ? `Last synced ${formatSince(lastSync)}`
          : "Sync time unavailable"}
      </p>

      {movers === 0 && (
        <p className="split text-chalk-dim text-center pt-2">
          Nothing logged yet. Be the first on the board.
        </p>
      )}
    </main>
  );
}

/** "12 minutes ago", "3 hours ago", "2 days ago". */
function formatSince(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";

  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
