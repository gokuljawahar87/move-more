"use client";

import { useEffect, useState } from "react";
import { SEASON } from "@/lib/season";

/**
 * Full-screen splash shown while the app boots.
 *
 * Behaviour:
 *  - Holds for MIN_MS so it never flashes on a fast connection
 *  - Waits for the window load event, so it covers font and data loading
 *  - Fades out rather than cutting
 *  - Shows once per browser session, not on every tab switch
 *  - Respects prefers-reduced-motion
 */

const MIN_MS = 1400; // minimum time on screen
const FADE_MS = 500; // fade-out duration

export default function Splash() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(true);

  useEffect(() => {
    // Only on the first visit of a session. Without this, the splash
    // replays every time someone navigates back to the app.
    const seen = sessionStorage.getItem("splash_seen");
    if (seen) return;

    setGone(false);
    setMounted(true);

    const started = Date.now();

    const dismiss = () => {
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_MS - elapsed);

      setTimeout(() => {
        setLeaving(true);
        sessionStorage.setItem("splash_seen", "1");
        setTimeout(() => setGone(true), FADE_MS);
      }, wait);
    };

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
      // Safety net — never trap someone behind the splash if a slow
      // asset stalls the load event.
      const failsafe = setTimeout(dismiss, 5000);
      return () => {
        window.removeEventListener("load", dismiss);
        clearTimeout(failsafe);
      };
    }
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "var(--ink-950)",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      {/* The 9:16 artwork. object-cover fills a phone edge to edge; on a
          wider screen the image is capped so it doesn't stretch, and the
          ink background fills the rest. */}
      <img
        src="/splash.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover sm:object-contain"
        style={{
          transform: mounted && !leaving ? "scale(1)" : "scale(1.04)",
          transition: "transform 2.5s ease-out",
        }}
      />

      {/* Wordmark over the artwork. Delete this block if your image
          already carries the title. */}
      <div className="relative z-10 text-center px-6 pb-[18vh] flex flex-col justify-end h-full">
        <p className="font-display font-600 uppercase tracking-[0.22em] text-tape text-xs drop-shadow-lg">
          Season {String(SEASON.number).padStart(2, "0")}
        </p>
      </div>

      {/* Loading bar — a running track lane */}
      <div className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 w-28 h-[3px] rounded-full bg-white/15 overflow-hidden">
        <div className="h-full w-1/3 bg-tape rounded-full animate-[splash-sweep_1.2s_ease-in-out_infinite]" />
      </div>

      <style jsx>{`
        @keyframes splash-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
    </div>
  );
}
