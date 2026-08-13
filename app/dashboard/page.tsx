"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, Link2, Check } from "lucide-react";
import { SEASON } from "@/lib/season";
import { teamLogo, teamName } from "@/lib/teams";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isGuest = searchParams?.get("guest") === "true";

  useEffect(() => {
    async function loadProfile() {
      if (isGuest) {
        router.replace("/app?guest=true");
        return;
      }

      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        // Not on this season's roster
        if (data?.not_employee) {
          setProfile({ not_employee: true });
          setLoading(false);
          return;
        }

        // ⬇️ THE FIX
        // The old check was `!data?.user_id`, which passes for a Season 1
        // profile because that response still carries a user_id. The
        // no_profile flag is what actually says "not registered this
        // season", and it was being ignored — so returning users walked
        // straight in with last year's team.
        if (!data?.user_id || data?.no_profile) {
          router.replace("/register");
          return;
        }

        setProfile(data);

        if (data?.strava_connected) {
          router.replace("/app");
        }
      } catch {
        router.replace("/register");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, isGuest]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="animate-spin text-tape" size={22} />
        <p className="eyebrow text-[10px]">Loading</p>
      </div>
    );
  }

  // ── Not on the roster ────────────────────────────────────────
  if (profile?.not_employee) {
    return (
      <div className="flex items-center justify-center min-h-screen px-5">
        <div className="bib w-full max-w-sm px-6 pt-7 pb-6 text-center">
          <p className="eyebrow text-[10px] mb-3">Access restricted</p>
          <h1 className="font-display font-700 uppercase text-2xl leading-tight">
            Not on the roster
          </h1>
          <p className="text-sm text-chalk-dim mt-3 mb-5">
            Your employee ID isn&apos;t on the Season {SEASON.number} list. If
            that looks wrong, contact the organiser — otherwise you can still
            follow along as a guest.
          </p>
          <button
            onClick={() => router.replace("/app?guest=true")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-ink-800
                       hover:border-ink-700 hover:bg-ink-900 font-display font-600
                       uppercase tracking-[0.1em] text-[13px] text-chalk-dim
                       hover:text-chalk transition-colors"
          >
            <Eye size={14} />
            View as guest
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-chalk-dim">No profile found. Please register.</p>
      </div>
    );
  }

  const logo = teamLogo(profile.team);

  // ── Connect Strava ───────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="eyebrow text-[10px] mb-2">
            Season {String(SEASON.number).padStart(2, "0")}
          </p>
          <h1 className="font-display font-700 uppercase leading-[0.9] text-[34px]">
            You&apos;re on
            <br />
            the start line
          </h1>
        </div>

        <div className="bib px-6 pt-7 pb-6 text-center">
          {logo && (
            <img
              src={logo}
              alt=""
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-1 ring-ink-700"
            />
          )}

          <p className="font-display font-600 uppercase tracking-wide text-xl">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="split text-tape mt-1">{teamName(profile.team)}</p>

          <div className="h-px bg-ink-800 my-5" />

          {!profile.strava_connected ? (
            <>
              <p className="text-sm text-chalk-dim mb-4">
                One step left — connect Strava so your activities count.
              </p>
              <button
                onClick={() =>
                  (window.location.href = `/api/strava/connect?user_id=${profile.user_id}`)
                }
                className="w-full flex items-center justify-center gap-2 bg-tape hover:bg-tape-deep
                           text-ink-950 py-3 rounded-lg font-display font-700
                           uppercase tracking-[0.1em] text-[15px] transition-colors"
              >
                <Link2 size={16} strokeWidth={2.5} />
                Connect Strava
              </button>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-walk font-display font-600 uppercase tracking-wide">
              <Check size={16} strokeWidth={3} />
              Strava connected
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-tape" size={22} />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
