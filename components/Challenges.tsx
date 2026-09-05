// components/Challenges.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2, Trophy, Check, Target, Route, Clock, Zap, Sunrise, Moon, Layers, Shuffle, Lock, TrendingUp } from "lucide-react";
import { teamName } from "@/lib/teams";

const ICONS: Record<string, any> = {
  target: Target,
  route: Route,
  clock: Clock,
  zap: Zap,
  sunrise: Sunrise,
  moon: Moon,
  layers: Layers,
  shuffle: Shuffle,
  trending: TrendingUp,
};

const DIFF_COLOUR: Record<string, string> = {
  easy: "var(--walk)",
  medium: "var(--cycle)",
  hard: "var(--run)",
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Challenges() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<number | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (week) qs.set("week", String(week));
        if (day) qs.set("day", day);
        const res = await fetch(`/api/challenges?${qs}`);
        const json = await res.json();
        setData(json);
        if (week === null) setWeek(json.week);
        if (!day || !json.days?.includes(day)) setDay(json.selectedDay);
      } catch (err) {
        console.error("Challenges load failed", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, day]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-tape" size={22} />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="font-display uppercase tracking-wide text-lg">
          Challenges unavailable
        </p>
        <p className="split text-chalk-dim mt-1">Pull down to try again.</p>
      </div>
    );
  }

  // Before the season opens there is no schedule to show. A countdown
  // is a better answer than an error page.
  if (data.notStarted || !data.days?.length) {
    return (
      <div className="px-4 py-14 text-center">
        <p className="eyebrow text-[10px]">Weekly challenges</p>
        <h2 className="font-display font-700 uppercase leading-[0.9] text-[32px] mt-2">
          Not open
          <br />
          just yet
        </h2>
        <p className="split text-chalk-dim mt-4">
          Challenges begin on{" "}
          <span className="text-tape">
            {data.seasonStart
              ? new Date(`${data.seasonStart}T12:00:00+05:30`).toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "long" }
                )
              : "day one"}
          </span>
          .
        </p>
        <p className="split text-chalk-dim mt-2">
          Two challenges each weekday, three at weekends.
        </p>
      </div>
    );
  }

  const board = data.leaderboard ?? [];
  const pacesetters = data.pacesetters ?? [];
  const anyScores = board.length > 0 || pacesetters.length > 0;

  // Everyone on the top score shares first place; the next two distinct
  // finishers fill the places below.
  const topScore = board[0]?.points ?? 0;
  const leaders = board.filter((p: any) => p.points === topScore);
  const chasers = board.slice(leaders.length, leaders.length + 2);

  return (
    <div className="px-4 py-5 space-y-5">
      {/* ── Week navigator + progress ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-tape flex items-center justify-center shrink-0">
              <Trophy size={14} className="text-ink-950" strokeWidth={2.5} />
            </span>
            <h1 className="font-display font-700 uppercase tracking-wide text-xl">
              Weekly Challenge
            </h1>
          </div>

          <span className="split text-chalk-dim shrink-0">
            {data.goalsDone}/{data.goalsTotal} goals
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            disabled={data.week <= 1}
            onClick={() => {
              setWeek(data.week - 1);
              setDay(null);
            }}
            aria-label="Previous week"
            className="p-1.5 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 disabled:opacity-25 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="font-display font-600 uppercase tracking-[0.14em] text-sm px-4 py-1.5 rounded-full bg-ink-900 border border-ink-800">
            Week {data.week}
          </span>

          <button
            disabled={data.week >= data.totalWeeks}
            onClick={() => {
              setWeek(data.week + 1);
              setDay(null);
            }}
            aria-label="Next week"
            className="p-1.5 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 disabled:opacity-25 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Weekly leaderboard ─────────────────────────────────
          One combined board. The champion boxes below split the
          weekly winners into women and men. */}
      {board.length > 0 ? (
        <div className="space-y-2">
          {/* Everyone level at the top shares first place. Showing one
              of them and burying the rest in the full list made a tie
              look like a win. */}
          {leaders.map((p: any) => (
            <div
              key={p.user_id}
              className="bib bib-1 flex items-center gap-3 px-3.5 pt-4 pb-3"
            >
              <span
                className="bib-number w-8 text-center"
                style={{ color: "var(--gold)" }}
              >
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-600 uppercase tracking-wide text-[16px] truncate">
                  {p.name}
                </p>
                <p className="split text-chalk-dim truncate">
                  {teamName(p.team)}
                </p>
              </div>
              <span className="readout text-xl text-tape shrink-0">
                {p.points}
              </span>
            </div>
          ))}

          {leaders.length > 1 && (
            <p className="split text-chalk-dim text-center py-0.5">
              {leaders.length} level at the top
            </p>
          )}

          {chasers.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {chasers.map((p: any, i: number) => (
                <div
                  key={p.user_id}
                  className={`bib bib-${i + 2} flex items-center gap-2.5 px-3 pt-4 pb-3`}
                >
                  <span
                    className="bib-number text-2xl w-5 text-center"
                    style={{
                      color: i === 0 ? "var(--silver)" : "var(--bronze)",
                    }}
                  >
                    {leaders.length + i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-600 uppercase text-[13px] truncate">
                      {p.name}
                    </p>
                    <p className="split text-chalk-dim text-[10px]">
                      {p.points} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bib px-4 pt-5 pb-4 text-center">
          <p className="split text-chalk-dim">
            Nobody has scored on the Open board yet. First one takes the lead.
          </p>
        </div>
      )}

      {/* The expander sits OUTSIDE the podium branch. It used to be
          inside it, so when the Open board was empty the Pacesetters
          column had no way to be reached. */}
      {anyScores && (
        <>
          <button
            onClick={() => setShowBoard((v: boolean) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 font-display uppercase tracking-[0.12em] text-[11px] text-chalk-dim hover:text-chalk transition-colors"
          >
            {showBoard ? "Hide" : "Show full"} leaderboard
            <ChevronDown
              size={13}
              className={showBoard ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>

          {showBoard && (
            <div className="grid grid-cols-2 gap-2">
              {/* Two columns. Regular runners play the same challenges
                  and see the same progress, but are ranked among
                  themselves — the weekly champion slots belong to the
                  Open board. */}
              <BoardColumn title="Open" list={board} />
              <BoardColumn
                title="Pacesetters"
                list={data.pacesetters ?? []}
                muted
              />
            </div>
          )}
        </>
      )}

      {/* ── Day strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5">
        {data.days.map((d: string) => {
          const dt = new Date(`${d}T12:00:00+05:30`);
          const active = d === data.selectedDay;
          const future = d > data.today;

          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`flex flex-col items-center py-2 rounded-lg border transition-colors ${
                active
                  ? "bg-tape border-tape text-ink-950"
                  : future
                  ? "bg-ink-900 border-ink-800 text-chalk-dim opacity-50"
                  : "bg-ink-900 border-ink-800 text-chalk-dim hover:border-ink-700"
              }`}
            >
              <span className="font-display uppercase text-[9px] tracking-wider">
                {DOW[dt.getUTCDay()]}
              </span>
              <span
                className={`readout text-base leading-none mt-0.5 ${
                  active ? "text-ink-950" : "text-chalk"
                }`}
              >
                {d.slice(8)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── The day's challenges ──────────────────────────────── */}
      <div className="space-y-2.5">
        {data.challenges.map((c: any) => {
          const Icon = ICONS[c.icon] ?? Target;
          const colour = DIFF_COLOUR[c.difficulty];

          return (
            <div
              key={c.id}
              className="bib flex items-start gap-3 px-3.5 pt-5 pb-3.5"
              style={
                c.completed
                  ? { boxShadow: "inset 3px 0 0 var(--walk)" }
                  : undefined
              }
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${colour}22` }}
              >
                <Icon size={16} style={{ color: colour }} strokeWidth={2.2} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display font-600 uppercase tracking-wide text-[15px] leading-tight">
                  {c.title}
                </p>
                <p className="text-[13px] text-chalk-dim mt-0.5 leading-snug">
                  {c.blurb}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9.5px] font-display font-600 uppercase tracking-wider"
                    style={{
                      backgroundColor: c.completed
                        ? "rgba(95,220,178,0.15)"
                        : "var(--ink-800)",
                      color: c.completed ? "var(--walk)" : "var(--chalk-dim)",
                    }}
                  >
                    {c.completed ? "Complete" : "Pending"}
                  </span>
                  <span className="eyebrow text-[9px]" style={{ color: colour }}>
                    {c.difficulty}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                {c.completed ? (
                  <Check size={17} className="text-walk ml-auto" strokeWidth={3} />
                ) : (
                  <span className="block w-[17px] h-[17px] rounded border border-ink-700 ml-auto" />
                )}
                <span className="split text-chalk-dim block mt-2">
                  {c.points} pts
                </span>
              </div>
            </div>
          );
        })}

        {/* Clean sweep bonus */}
        <div
          className="bib px-3.5 pt-4 pb-3.5 flex items-center gap-3"
          style={
            data.cleanSweep ? { boxShadow: "inset 3px 0 0 var(--tape)" } : undefined
          }
        >
          <Trophy
            size={16}
            className={data.cleanSweep ? "text-tape" : "text-chalk-dim"}
            strokeWidth={2.2}
          />
          <div className="flex-1">
            <p className="font-display font-600 uppercase tracking-wide text-[13px]">
              Clean Sweep
            </p>
            <p className="split text-chalk-dim">
              All of today&apos;s challenges
            </p>
          </div>
          <span
            className="readout text-base"
            style={{ color: data.cleanSweep ? "var(--tape)" : "var(--chalk-dim)" }}
          >
            +{data.cleanSweepPoints}
          </span>
        </div>
      </div>

      {/* ── Your week ─────────────────────────────────────────── */}
      <div className="bib flex items-center justify-between px-4 pt-5 pb-4">
        <div>
          <p className="eyebrow text-[9px]">Your week</p>
          <span className="readout text-[32px] leading-none block mt-1 text-tape">
            {data.myPoints}
          </span>
        </div>
        <div className="text-right">
          {/* Ranked within your own column, so the label has to say
              which one — otherwise a Pacesetter sees "Rank 2" and
              wonders why they aren't second on the podium. */}
          <p className="eyebrow text-[9px]">
            {data.isPacesetter ? "Pacesetters" : "Rank"}
          </p>
          <span className="readout text-xl block mt-1">
            {data.myRank ?? "—"}
          </span>
        </div>
      </div>

      {data.isPacesetter && (
        <p className="split text-chalk-dim text-center leading-relaxed">
          You&apos;re in the Pacesetters column — same challenges, ranked
          among the regular runners. The weekly champion slots go to the
          Open board.
        </p>
      )}

      {/* ── Champion boxes ────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-2.5 pb-2 border-b border-ink-800">
          <h2 className="font-display font-700 uppercase tracking-[0.08em] text-lg">
            Champions
          </h2>
          <span className="split text-chalk-dim">8 weeks</span>
        </div>

        {/* Two columns — Women on the left, Men on the right. The
            column header carries the label, so each card only has to
            hold a week number and a name. */}
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
          <p className="eyebrow text-[9px] pb-0.5">Women</p>
          <p className="eyebrow text-[9px] pb-0.5">Men</p>

          {data.champions.map((c: any) =>
            (["women", "men"] as const).map((side) => {
              const slot = c[side];
              const upcoming = slot.status === "upcoming";

              return (
                <div
                  key={`${c.week}-${side}`}
                  className={`bib px-3 pt-4 pb-2.5 ${upcoming ? "opacity-40" : ""}`}
                  style={
                    slot.status === "settled"
                      ? { boxShadow: "inset 3px 0 0 var(--gold)" }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-[9px]">Week {c.week}</span>
                    {slot.status === "settled" && (
                      <Trophy size={10} className="text-gold shrink-0" />
                    )}
                    {slot.status === "live" && (
                      <span className="split text-tape text-[9px]">live</span>
                    )}
                    {upcoming && <Lock size={9} className="text-chalk-dim" />}
                  </div>

                  {slot.names?.length ? (
                    <>
                      {/* Joint champions share one card. A tie is a
                          shared win, not two separate ones. */}
                      {slot.names.map((n: string) => (
                        <p
                          key={n}
                          className="font-display font-600 uppercase text-[13px] leading-tight mt-1.5 truncate"
                        >
                          {n}
                        </p>
                      ))}
                      <p className="split text-chalk-dim text-[10px] mt-0.5">
                        {slot.points} pts
                        {slot.names.length > 1 && ` · ${slot.names.length} joint`}
                      </p>
                    </>
                  ) : (
                    <p className="font-display uppercase text-[13px] text-chalk-dim mt-1.5">
                      {upcoming ? "—" : "Not settled"}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="split text-chalk-dim text-center pt-1">
        Challenge points reset every Monday and don&apos;t affect the season
        leaderboard.
      </p>
    </div>
  );
}

/** One ranked column of the expanded weekly leaderboard. */
function BoardColumn({
  title,
  list,
  muted = false,
}: {
  title: string;
  list: any[];
  muted?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow text-[9px] mb-1.5 px-1">{title}</p>

      {list.length > 0 ? (
        <div className="bib divide-y divide-ink-800">
          {list.map((p: any, i: number) => {
            // Names are long and the column is half a phone wide, so
            // show the first name and a last initial rather than
            // truncating everyone to the same three letters.
            const parts = String(p.name ?? "").trim().split(/\s+/);
            const short =
              parts.length > 1
                ? `${parts[0]} ${parts[parts.length - 1][0]}`
                : parts[0] ?? "";

            return (
              <div
                key={p.user_id}
                className="flex items-center gap-2 px-2.5 py-2"
              >
                <span className="split text-chalk-dim w-3 shrink-0 text-[10px]">
                  {i + 1}
                </span>
                <span className="text-[13px] flex-1 truncate">{short}</span>
                <span
                  className={`readout text-[13px] shrink-0 ${
                    muted ? "text-chalk-dim" : ""
                  }`}
                >
                  {p.points}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bib px-3 py-3">
          <p className="split text-chalk-dim text-[10px]">Nobody yet.</p>
        </div>
      )}
    </div>
  );
}
