// components/Header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Link2, X } from "lucide-react";
import UserStatsDrawer from "./UserStatsDrawer";
import { SEASON, getSeasonStatus, type SeasonStatus } from "@/lib/season";

export function Header({ isGuest = false }: { isGuest?: boolean }) {
  const [initials, setInitials] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<SeasonStatus | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu on an outside tap or Escape. Without this the
  // only way to dismiss it was tapping the avatar again, which isn't
  // discoverable — it read as stuck open.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (isGuest) return;

    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const p = await res.json();
        setProfile(p);
        if (p?.first_name || p?.last_name) {
          setInitials(
            `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase()
          );
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    }
    fetchProfile();
  }, [isGuest]);

  // Season clock — ticks once a minute, not once a second. A month-long
  // event doesn't need a seconds counter; it just burns battery.
  useEffect(() => {
    setStatus(getSeasonStatus());
    const interval = setInterval(() => setStatus(getSeasonStatus()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectStrava = () => {
    if (!profile?.user_id) return;
    window.location.href = `/api/strava/connect?user_id=${profile.user_id}`;
  };

  return (
    <>
      {/* In-flow, not fixed. The page is a flex column with a scrolling
          content area below, so the header stays put on its own — and
          nothing needs a hand-tuned padding value to clear it. */}
      <header className="relative z-40 shrink-0 bg-ink-950 border-b border-ink-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => !isGuest && setSidebarOpen(true)}
              disabled={isGuest}
              aria-label="Open your stats"
              className="p-1.5 -ml-1.5 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Menu size={20} />
            </button>

            <img src="/logo.png" alt="" className="w-7 h-7 rounded" />

            <div className="min-w-0 leading-none">
              <div className="font-display font-700 uppercase tracking-wide text-[15px] truncate">
                {SEASON.title}
              </div>
              <div className="eyebrow text-[9px] mt-0.5">
                Season {String(SEASON.number).padStart(2, "0")}
              </div>
            </div>
          </div>

          {!isGuest && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Your profile"
                aria-expanded={menuOpen}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-tape text-ink-950 font-display font-700 text-sm"
              >
                {initials || "—"}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 bib p-4 z-50">
                  <button
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close"
                    className="absolute top-2.5 right-2.5 p-1 rounded text-chalk-dim hover:text-chalk hover:bg-ink-800 transition-colors"
                  >
                    <X size={14} />
                  </button>

                  <p className="font-display font-600 uppercase tracking-wide text-base pt-1 pr-6">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  {profile?.team && (
                    <p className="split text-chalk-dim mt-0.5">
                      {profile.team}
                    </p>
                  )}

                  <div className="h-px bg-ink-800 my-3" />

                  {profile?.strava_connected ? (
                    <p className="flex items-center gap-2 text-sm text-walk">
                      <Link2 size={14} />
                      Strava connected
                    </p>
                  ) : (
                    <button
                      onClick={handleConnectStrava}
                      className="w-full bg-tape text-ink-950 px-3 py-2 rounded-lg font-display font-700 uppercase tracking-wide text-sm hover:bg-tape-deep transition-colors"
                    >
                      Connect Strava
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Season progress strip ──────────────────────────────
            Replaces Season 1's hardcoded countdown. Shows position
            within the season rather than a ticking clock — more
            useful information for a month-long event. */}
        {status && (
          <div className="px-4 pb-2">
            <div className="flex items-baseline justify-between mb-1">
              {status.phase === "live" && (
                <>
                  <span className="eyebrow text-[9px]">
                    Day {status.dayNumber} of {status.totalDays}
                  </span>
                  <span className="split text-tape">
                    {status.remaining} left
                  </span>
                </>
              )}
              {status.phase === "upcoming" && (
                <>
                  <span className="eyebrow text-[9px]">Starts soon</span>
                  <span className="split text-tape">
                    in {status.remaining}
                  </span>
                </>
              )}
              {status.phase === "ended" && (
                <>
                  <span className="eyebrow text-[9px]">Season complete</span>
                  <span className="split text-tape">See Champions</span>
                </>
              )}
            </div>

            <div className="h-[3px] w-full bg-ink-800 rounded-full overflow-hidden">
              <div
                className={
                  status.phase === "ended"
                    ? "h-full tape-strip"
                    : "h-full bg-tape transition-all duration-700"
                }
                style={{ width: `${Math.max(1.5, status.progress)}%` }}
              />
            </div>
          </div>
        )}

        {isGuest && (
          <div className="tape-strip">
            <div className="bg-ink-950/85 py-1.5 text-center">
              <span className="eyebrow text-[9px] text-tape">
                Guest view · read only
              </span>
            </div>
          </div>
        )}
      </header>

      {!isGuest && (
        <UserStatsDrawer
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userId={profile?.user_id || null}
        />
      )}
    </>
  );
}
