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
  Share2,
} from "lucide-react";
import { teamLogo, teamName } from "@/lib/teams";

type Popup = {
  kind: "announcement" | "milestone" | "champion";
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
  /** The raw team string as stored on the event, resolved via lib/teams.ts */
  team?: string | null;
  /** Champion popups only */
  week?: number;
  women?: ChampionEntry[];
  men?: ChampionEntry[];
};

type ChampionEntry = {
  name: string;
  team: string | null;
  points: number;
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
 * Hex equivalents of the app's CSS colour variables.
 *
 * Canvas can't read `var(--walk)` the way the DOM can — it needs an
 * actual colour value — so the same brand palette is repeated here as
 * literal hex. Keep these in step with globals.css if the palette
 * ever changes.
 */
const HEX = {
  ink: "#150E22",
  card: "#241A3A",
  chalk: "#F5F3EE",
  dim: "#C3BAD6",
  tape: "#FFC93C",
  run: "#FF7B7B",
  walk: "#5FDCB2",
  cycle: "#7FB5FF",
} as const;

const BADGE_HEX: Record<string, string> = {
  walk: HEX.walk,
  run: HEX.run,
  cycle: HEX.cycle,
  streak: HEX.tape,
  points: HEX.tape,
};

const METRIC_EMOJI: Record<string, string> = {
  walk: "\u{1F6B6}",
  run: "\u{1F3C3}",
  cycle: "\u{1F6B4}",
  streak: "\u{1F525}",
  points: "\u{1F3C6}",
};

/**
 * The message that goes with the shared image.
 *
 * popup.title reads like "50 km on foot" or "10 days unbroken" — built
 * for the card, where it sits under a name that's already on screen.
 * As a sentence it needs a verb and the activity named properly, so
 * this maps it to something that reads naturally on its own:
 * "Congrats Arunkumar for hitting 50km in walking."
 */
const METRIC_LABEL: Record<string, string> = {
  walk: "walking",
  run: "running",
  cycle: "cycling",
  streak: "their streak",
  points: "points",
};

function buildCaption(popup: Popup): string {
  const metric = METRIC_LABEL[popup.metric ?? "points"] ?? "points";
  const unit =
    popup.metric === "streak"
      ? "days"
      : popup.metric === "points"
      ? "points"
      : "km";
  const amount = `${popup.threshold}${unit}`;

  // Just the one line — no footer, no extra encouragement underneath.
  return popup.mine
    ? `\u{1F3C5} Congrats to me for hitting ${amount} in ${metric}!`
    : `\u{1F3C5} Congrats ${popup.who} for hitting ${amount} in ${metric}!`;
}

/**
 * Draws a shareable version of the milestone card.
 *
 * A plain canvas rather than a screenshot library: the card is simple
 * shapes and text, so there's no need for the extra dependency and
 * load time a DOM-to-image tool would add. Exact brand fonts aren't
 * used here — canvas needs a font-family name it can resolve, and
 * matching the app's loaded fonts exactly would be fragile — so this
 * falls back to bold system fonts. Colours and layout carry the brand
 * identity instead.
 */
async function renderMilestoneImage(popup: Popup): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const badgeColour = BADGE_HEX[popup.metric ?? "points"] ?? HEX.tape;
  const emoji = METRIC_EMOJI[popup.metric ?? "points"] ?? "\u{1F3C6}";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = HEX.ink;
  ctx.fillRect(0, 0, W, H);

  // Card panel
  const pad = 64;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 28);
  ctx.fillStyle = HEX.card;
  ctx.fill();

  ctx.textAlign = "center";

  // Emoji flourish
  ctx.font = "84px sans-serif";
  ctx.fillText(emoji, W / 2, 260);

  // Kicker
  ctx.fillStyle = HEX.dim;
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText((popup.kicker ?? "").toUpperCase(), W / 2, 320);

  // Ring
  const cx = W / 2;
  const cy = 560;
  const outerR = 200;

  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = badgeColour;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 28, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = badgeColour;
  ctx.stroke();

  // Number + unit, centred inside the ring
  ctx.fillStyle = badgeColour;
  ctx.font = "700 150px system-ui, sans-serif";
  ctx.fillText(String(popup.threshold ?? ""), cx, cy + 45);

  const unit =
    popup.metric === "streak"
      ? "DAYS"
      : popup.metric === "points"
      ? "PTS"
      : "KM";
  ctx.fillStyle = HEX.dim;
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(unit, cx, cy + 100);

  // Name — shrink to fit rather than overflow the card
  const name = (popup.who ?? "You").toUpperCase();
  let nameSize = 76;
  ctx.font = `700 ${nameSize}px system-ui, sans-serif`;
  while (ctx.measureText(name).width > W - pad * 3 && nameSize > 36) {
    nameSize -= 4;
    ctx.font = `700 ${nameSize}px system-ui, sans-serif`;
  }
  ctx.fillStyle = HEX.chalk;
  ctx.fillText(name, cx, 900);

  // Title
  ctx.fillStyle = badgeColour;
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText(popup.title.toUpperCase(), cx, 970);

  // Team — logo and name, right below the title. Drawn last among the
  // content blocks so a slow-loading (or missing) logo can't hold up
  // everything else; the image is only awaited here, once the rest of
  // the layout is already committed to the canvas.
  if (popup.team) {
    const displayTeam = teamName(popup.team);
    const logoUrl = teamLogo(popup.team);
    const logoY = 1055;
    const logoR = 46;

    if (logoUrl) {
      const img = await loadImage(logoUrl);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, logoY, logoR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx - logoR, logoY - logoR, logoR * 2, logoR * 2);
        ctx.restore();

        // A thin ring, matching the ring-1 ring-ink-700 treatment
        // logos get everywhere else in the app.
        ctx.beginPath();
        ctx.arc(cx, logoY, logoR, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = HEX.dim;
        ctx.stroke();
      }
    }

    ctx.fillStyle = HEX.dim;
    ctx.font = "600 32px system-ui, sans-serif";
    ctx.fillText(displayTeam.toUpperCase(), cx, logoY + logoR + 50);
  }

  // Footer
  ctx.fillStyle = HEX.dim;
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText("MOVE-ATHON MANIA \u00B7 SEASON 2", cx, H - pad - 30);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the image"));
    }, "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Resolves to null rather than rejecting, so a missing or broken
 * logo just gets skipped instead of failing the whole share. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Staged rollout for sharing.
 *
 * Only these user IDs see the Share button for now — with ~100 people
 * in the group, everyone getting it at once would mean the WhatsApp
 * group filling with milestone images the moment this deploys. Add IDs
 * here to widen it, or empty the set to turn it on for everyone.
 */
const SHARE_ENABLED_FOR = new Set<string>(["U262861"]);

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
  const [sharing, setSharing] = useState(false);
  // Read once on mount. Every other part of the app already relies on
  // this same localStorage key to know who's signed in, so this reads
  // the same source rather than adding a new one.
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    try {
      const uid = localStorage.getItem("user_id");
      setCanShare(
        SHARE_ENABLED_FOR.size === 0 || (!!uid && SHARE_ENABLED_FOR.has(uid))
      );
    } catch {
      // localStorage can throw in some locked-down browser contexts —
      // default to not sharing rather than crash the popup.
      setCanShare(false);
    }
  }, []);

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
  const isChampion = popup.kind === "champion";

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

  /**
   * Renders the card as an image and hands it to the device's share
   * sheet with a caption. Falls back gracefully on browsers that can't
   * share files (or can't share at all): plain text share, then — as a
   * last resort — download the image and open WhatsApp Web with the
   * caption pre-filled, so it can be attached by hand.
   */
  async function shareMilestone() {
    if (!popup || sharing) return;
    setSharing(true);

    try {
      const blob = await renderMilestoneImage(popup);
      const caption = buildCaption(popup);
      const file = new File([blob], "milestone.png", { type: "image/png" });
      const nav = navigator as any;

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          files: [file],
          text: caption,
          title: "Move-Athon Mania",
        });
        return;
      }

      if (nav.share) {
        await nav.share({ text: caption });
        return;
      }

      // No share sheet at all — hand over both pieces separately.
      downloadBlob(blob, "milestone.png");
      window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank");
    } catch (err: any) {
      // Cancelling the native share sheet throws AbortError — that's
      // the person changing their mind, not a failure.
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setSharing(false);
    }
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

        {isChampion ? (
            <>
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: "var(--gold)" }}
              >
                <Trophy size={26} className="text-ink-950" strokeWidth={2.2} />
              </div>

              <p className="eyebrow text-[9px] mt-4">{popup.kicker}</p>

              <h2 className="font-display font-700 uppercase leading-tight text-[24px] mt-1.5">
                {popup.title}
              </h2>

              {/* Both boards on one card. The week has one result, not
                  two, so it shouldn't arrive as two separate popups. */}
              <div className="grid grid-cols-2 gap-3 mt-5 text-left">
                <ChampionColumn label="Women" list={popup.women ?? []} />
                <ChampionColumn label="Men" list={popup.men ?? []} />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <button
            onClick={dismiss}
            className="w-full mt-6 bg-tape hover:bg-tape-deep text-ink-950 py-3 rounded-lg
                       font-display font-700 uppercase tracking-[0.1em] text-[14px]
                       transition-colors"
          >
            {isChampion
              ? "Well played"
              : isMilestone
              ? popup.who
                ? "Nice one"
                : "Thanks"
              : "Got it"}
          </button>

          {/* Sharing is scoped to milestones — this is the case
              someone actually wants to post to the group. Champion and
              announcement cards can get the same treatment later if
              it's wanted there too. */}
          {isMilestone && canShare && (
            <button
              onClick={shareMilestone}
              disabled={sharing}
              className="w-full mt-2.5 flex items-center justify-center gap-2
                         border border-ink-800 hover:border-tape hover:text-tape
                         text-chalk-dim py-2.5 rounded-lg font-display font-600
                         uppercase tracking-[0.1em] text-[12px] transition-colors
                         disabled:opacity-50"
            >
              <Share2 size={14} />
              {sharing ? "Preparing…" : "Share"}
            </button>
          )}

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

/** One board's winners inside the weekly champion card. */
function ChampionColumn({
  label,
  list,
}: {
  label: string;
  list: ChampionEntry[];
}) {
  return (
    <div>
      <p className="eyebrow text-[8px] pb-1.5 mb-1.5 border-b border-ink-800">
        {label}
      </p>

      {list.length > 0 ? (
        <div className="space-y-1.5">
          {list.map((c) => (
            <div key={c.name}>
              <p className="font-display font-600 uppercase text-[12px] leading-tight">
                {c.name}
              </p>
              <p className="split text-chalk-dim text-[9px]">
                {c.points} pts
              </p>
            </div>
          ))}
          {list.length > 1 && (
            <p className="split text-tape text-[9px]">Joint winners</p>
          )}
        </div>
      ) : (
        <p className="split text-chalk-dim text-[10px]">Not settled</p>
      )}
    </div>
  );
}
