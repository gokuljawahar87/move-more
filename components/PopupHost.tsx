// components/PopupHost.tsx
"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  X,
  Megaphone,
  Trophy,
  Footprints,
  Bike,
  Activity,
  Flame,
} from "lucide-react";

type Popup = {
  kind: "announcement" | "milestone";
  key: string;
  kicker: string;
  title: string;
  body: string;
  /** For someone else's milestone, who reached it */
  who?: string | null;
  /** True when it's the reader's own */
  mine?: boolean;
  /** walk | run | cycle | streak | points */
  metric?: string;
  threshold?: number;
};

/**
 * Each discipline gets its own badge — the same colours used for run,
 * walk and cycle everywhere else in the app, so the icon is recognised
 * before the words are read.
 */
const BADGES: Record<
  string,
  { Icon: typeof Footprints; colour: string; unit: string }
> = {
  walk: { Icon: Footprints, colour: "var(--walk)", unit: "km" },
  run: { Icon: Activity, colour: "var(--run)", unit: "km" },
  cycle: { Icon: Bike, colour: "var(--cycle)", unit: "km" },
  streak: { Icon: Flame, colour: "var(--tape)", unit: "days" },
  points: { Icon: Trophy, colour: "var(--tape)", unit: "pts" },
};

/**
 * Shows at most one popup per app open.
 *
 * Announcements take priority over milestones — an announcement is
 * time-sensitive, a milestone will still be there tomorrow. Dismissing
 * records it server-side, so it never appears again on any device.
 */
export default function PopupHost() {
  const [popup, setPopup] = useState<Popup | null>(null);
  // The rest of this session's batch. Dismissing one shows the next,
  // so four people crossing a milestone means four cards in a row
  // rather than three of them going unrecognised.
  const [queue, setQueue] = useState<Popup[]>([]);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/popups").then((r) => r.json());
        if (!cancelled && res.popup) {
          setQueue(res.queue ?? []);
          // A beat before it appears, so it doesn't collide with the
          // page still painting.
          setTimeout(() => !cancelled && setPopup(res.popup), 700);
        }
      } catch {
        // A popup is never worth breaking the app over
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!popup) return null;

  const isMilestone = popup.kind === "milestone";
  const badge = BADGES[popup.metric ?? "points"] ?? BADGES.points;

  async function dismiss() {
    const current = popup!;
    setLeaving(true);

    // Record it, but don't hold up the next card waiting for the
    // network. If this fails they'll simply see it once more.
    fetch("/api/popups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: current.kind, key: current.key }),
    }).catch(() => {});

    setTimeout(() => {
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        setQueue(rest);
        setPopup(next);
        setLeaving(false);
      } else {
        setPopup(null);
      }
    }, 200);
  }

  return (
    <>
      {/* Centred with flex rather than a transform. Translate-based
          centring breaks the moment any ancestor has a transform of its
          own — `fixed` then resolves against that ancestor instead of
          the viewport, and the dialog ends up clipped at the top. */}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4
                   bg-black/70 transition-opacity duration-200"
        style={{ opacity: leaving ? 0 : 1 }}
        onClick={dismiss}
      >
        <div
          role="dialog"
          aria-label={popup.title}
          onClick={(e: MouseEvent) => e.stopPropagation()}
          className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto
                     bib px-6 pt-8 pb-6 text-center transition-transform duration-200"
          style={{ transform: `scale(${leaving ? 0.97 : 1})` }}
        >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 transition-colors"
        >
          <X size={16} />
        </button>

        {isMilestone ? (
            /* A medallion: coloured ring, discipline icon, and the
               number itself as the centrepiece. */
            <div className="relative w-[104px] h-[104px] mx-auto">
              <div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: badge.colour, opacity: 0.14 }}
              />
              <div
                className="absolute inset-[6px] rounded-full border-2 flex flex-col items-center justify-center"
                style={{ borderColor: badge.colour }}
              >
                <badge.Icon
                  size={17}
                  style={{ color: badge.colour }}
                  strokeWidth={2.2}
                />
                <span
                  className="readout text-[30px] leading-none mt-0.5"
                  style={{ color: badge.colour }}
                >
                  {popup.threshold || ""}
                </span>
                <span className="eyebrow text-[7px] mt-0.5">
                  {badge.unit}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,201,60,0.14)" }}
            >
              <Megaphone size={24} className="text-tape" strokeWidth={2.2} />
            </div>
          )}

          <p className="eyebrow text-[9px] mt-4">{popup.kicker}</p>

        {/* Somebody else's achievement leads with their name — the
            milestone is the subtitle. Your own leads with the
            milestone. */}
        {popup.who ? (
          <>
            <h2 className="font-display font-700 uppercase leading-tight text-[26px] mt-1.5">
              {popup.who}
            </h2>
            <p
              className="font-display font-600 uppercase tracking-wide text-[15px] mt-1"
              style={{ color: badge.colour }}
            >
              {popup.title}
            </p>
          </>
        ) : (
          <h2 className="font-display font-700 uppercase leading-tight text-[26px] mt-1.5">
            {popup.title}
          </h2>
        )}

        <p className="text-sm text-chalk-dim leading-relaxed mt-3">
          {popup.body}
        </p>

        <button
          onClick={dismiss}
          className="w-full mt-6 bg-tape hover:bg-tape-deep text-ink-950 py-3 rounded-lg
                     font-display font-700 uppercase tracking-[0.1em] text-[14px]
                     transition-colors"
        >
            {isMilestone ? (popup.who ? "Nice one" : "Thanks") : "Got it"}
          </button>

          {/* So people know the next card is a different person, not a
              glitch repeating itself. */}
          {queue.length > 0 && (
            <p className="split text-chalk-dim mt-3">
              {queue.length} more to see
            </p>
          )}
        </div>
      </div>
    </>
  );
}
