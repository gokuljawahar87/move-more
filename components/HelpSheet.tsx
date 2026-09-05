// components/HelpSheet.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { DAILY_POINT_CAP, RATE } from "@/lib/points";
import { CLEAN_SWEEP_POINTS } from "@/lib/challenges";
import { SEASON } from "@/lib/season";

/**
 * How the whole thing works, in one place.
 *
 * The challenge glossary is keyed off the families in lib/challenges.ts
 * rather than written out by hand, so a rule change can't leave this
 * page quietly describing the old behaviour.
 */

const FAMILY_HELP: { family: string; label: string; blurb: string }[] = [
  {
    family: "points",
    label: "Point targets",
    blurb:
      "Earn a set number of points in one day. Any mix of running, walking or cycling counts toward it.",
  },
  {
    family: "duration",
    label: "Duration",
    blurb:
      "One single activity lasting at least the stated time. Distance doesn't matter — only that it was one unbroken activity.",
  },
  {
    family: "single-distance",
    label: "Single distance",
    blurb:
      "One single activity of the stated distance. The cycling target is longer, because you cover ground faster on a bike.",
  },
  {
    family: "day-total",
    label: "Day total",
    blurb:
      "Everything you do that day added together. Walking and running add up as one; cycling has its own longer target.",
  },
  {
    family: "two-a-day",
    label: "Two a Day",
    blurb:
      "Two separate activities on the same day, each at least as long as stated. Two walks is fine, as is any mix of running, walking and cycling — but a single long activity doesn't count, and gym or yoga sessions don't either.",
  },
  {
    family: "mix",
    label: "Triple Threat",
    blurb:
      "Run, walk and cycle all on the same day, each one at least as long as stated.",
  },
  {
    family: "pace",
    label: "Quick Feet",
    blurb:
      "Cover the stated distance on foot at or faster than the given pace, within one activity. Walking counts if you're quick enough.",
  },
  {
    family: "early",
    label: "Early Bird",
    blurb:
      "Start an activity before the stated time. It has to last at least 15 minutes, so a one-minute start doesn't qualify.",
  },
  {
    family: "personal-best",
    label: "Better Than Before",
    blurb:
      "Cover more total distance this week than you did last week. The target is your own, so it's equally hard for everyone.",
  },
];

export default function HelpSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="How it works"
        className="fixed inset-x-0 bottom-0 top-10 z-[61] max-w-xl mx-auto
                   bg-ink-950 border-t border-ink-800 rounded-t-2xl
                   flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800 shrink-0">
          <div>
            <p className="eyebrow text-[9px]">
              Season {String(SEASON.number).padStart(2, "0")}
            </p>
            <h2 className="font-display font-700 uppercase text-xl leading-tight mt-0.5">
              How it works
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* ── Points ─────────────────────────────────────────── */}
          <Section title="How points work">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Rate label="Run" value={RATE.run} colour="var(--run)" />
              <Rate label="Walk" value={RATE.walk} colour="var(--walk)" />
              <Rate label="Cycle" value={RATE.cycle} colour="var(--cycle)" />
            </div>
            <P>
              You earn points per kilometre. A slow run — anything above 8:30
              per km — is scored as a walk. That&apos;s automatic and it
              isn&apos;t a judgement.
            </P>
            <Callout>
              Maximum <b>{DAILY_POINT_CAP} points per person per day</b>. Go
              further if you want to — your kilometres still count on the
              distance boards, it just stops adding to the team total.
            </Callout>
          </Section>

          {/* ── What doesn't count ─────────────────────────────── */}
          <Section title="What doesn't count">
            <Item
              head="Office hours"
              body="Activity between 7:30 am and 3:45 pm on a working day is excluded. Weekends and declared holidays are fine."
            />
            <Item
              head="Unless you're on leave"
              body="Mark the day as personal leave in the app BEFORE you head out, and that day's daytime activity counts. It shows publicly on your activity."
            />
            <Item
              head="Late night and early morning"
              body="Anything between 11:00 pm and 3:30 am doesn't count and won't appear in the feed. No leaderboard is worth being out on an unlit road at that hour — and unlike office hours, marking leave doesn't change this one."
            />
            <Item
              head="Manual entries"
              body="The app reads what your device recorded. Activities typed into Strava by hand are ignored."
            />
          </Section>

          {/* ── Streaks ────────────────────────────────────────── */}
          <Section title="Streaks">
            <P>
              A streak day needs <b>one single activity of 30 minutes or
              more</b>, outside office hours. Two fifteen-minute walks
              don&apos;t count — it has to be one.
            </P>
            <P>
              Today doesn&apos;t break your streak until the day is over, so
              an empty morning isn&apos;t a reset.
            </P>
          </Section>

          {/* ── Weekly challenges ──────────────────────────────── */}
          <Section title="Weekly challenges">
            <P>
              Two challenges each weekday, three at weekends. They reset every
              Monday, so a quiet week never puts you out of it. Complete all of
              a day&apos;s challenges for a <b>+{CLEAN_SWEEP_POINTS} clean
              sweep bonus</b>.
            </P>
            <P>
              Challenge points decide the weekly champions — one woman, one man
              — and never affect the main leaderboard.
            </P>

            <p className="eyebrow text-[9px] mt-4 mb-2">What each one means</p>
            <div className="space-y-2.5">
              {FAMILY_HELP.map((f) => (
                <div key={f.family} className="bib px-3.5 pt-4 pb-3">
                  <p className="font-display font-600 uppercase tracking-wide text-[13px] text-tape">
                    {f.label}
                  </p>
                  <p className="text-sm text-chalk-dim leading-relaxed mt-1">
                    {f.blurb}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Fair play ──────────────────────────────────────── */}
          <Section title="Fair play">
            <P>
              Every activity is checked automatically for patterns that suggest
              a recording problem — vehicle speeds, recordings left running all
              day, or an activity that continues into your commute.
            </P>
            <P>
              A flag isn&apos;t an accusation. Most turn out to be a forgotten
              stop button. Everything flagged is reviewed by a person, and if
              an activity of yours is set aside your team captain is told and
              can contest it.
            </P>
          </Section>

          {/* ── Do's and don'ts ────────────────────────────────── */}
          <Section title="A few habits that help">
            <Do good text="Stop the recording before you get in the car." />
            <Do good text="Record the activity, not the whole day." />
            <Do good text="Check the distance afterwards. If it surprises you, it'll surprise us." />
            <Do good text="Mark leave before you go out, not after." />
            <Do text="Don't push through pain to protect a streak. It's a game." />
            <Do text="Don't add activities by hand — they're ignored." />
          </Section>

          <p className="split text-ink-700 text-center pt-2 pb-6">
            Questions your captain can&apos;t answer? Ask the organisers.
          </p>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="font-display font-700 uppercase tracking-[0.08em] text-lg pb-2 mb-3 border-b border-ink-800">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-chalk-dim leading-relaxed">{children}</p>
  );
}

function Item({ head, body }: { head: string; body: string }) {
  return (
    <div>
      <p className="font-display font-600 uppercase tracking-wide text-[13px] text-chalk">
        {head}
      </p>
      <p className="text-sm text-chalk-dim leading-relaxed mt-0.5">{body}</p>
    </div>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="bib px-4 pt-4 pb-3 mt-3">
      <p className="text-sm text-chalk leading-relaxed">{children}</p>
    </div>
  );
}

function Rate({
  label,
  value,
  colour,
}: {
  label: string;
  value: number;
  colour: string;
}) {
  return (
    <div className="bib px-2 pt-4 pb-3 text-center">
      <span className="readout text-2xl" style={{ color: colour }}>
        {value}
      </span>
      <p className="eyebrow text-[8px] mt-1">{label} / km</p>
    </div>
  );
}

function Do({ text, good = false }: { text: string; good?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: good ? "var(--walk)" : "var(--run)" }}
      />
      <p className="text-sm text-chalk-dim leading-relaxed">{text}</p>
    </div>
  );
}
