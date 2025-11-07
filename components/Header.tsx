"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import UserStatsDrawer from "./UserStatsDrawer";

export function Header({ isGuest = false }: { isGuest?: boolean }) {
  const [initials, setInitials] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [countdown, setCountdown] = useState("");
  const [eventEnded, setEventEnded] = useState(false);

  useEffect(() => {
    if (isGuest) return; // 👈 Skip fetching profile in guest mode

    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const profile = await res.json();
        setProfile(profile);
        if (profile?.first_name || profile?.last_name) {
          const first = profile.first_name?.[0] ?? "";
          const last = profile.last_name?.[0] ?? "";
          setInitials(`${first}${last}`.toUpperCase());
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    }
    fetchProfile();
  }, [isGuest]);

  // ⏳ Countdown to 10 PM IST Today
  useEffect(() => {
    const target = new Date("2025-10-31T22:00:00+05:30").getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setEventEnded(true);
        setCountdown("");
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConnectStrava = () => {
    if (!profile?.user_id) return;
    window.location.href = `/api/strava/connect?user_id=${profile.user_id}`;
  };

  return (
    <>
      {/* 🔷 Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-blue-900 text-white shadow-md fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          {/* In guest mode, disable drawer */}
          <button
            onClick={() => !isGuest && setSidebarOpen(true)}
            className={`p-2 rounded ${
              isGuest ? "opacity-40 cursor-not-allowed" : "hover:bg-blue-800"
            }`}
          >
            <Menu size={22} />
          </button>

          <img src="/logo.png" alt="App Logo" className="w-8 h-8 rounded" />
          <h1 className="text-lg font-semibold">AAP – Move-Athon-Mania</h1>
        </div>

        {/* Profile Button (hidden in guest mode) */}
        {!isGuest && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black font-bold shadow"
            >
              {initials || "?"}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-lg p-4 z-50">
                <p className="font-semibold mb-2">
                  {profile?.first_name} {profile?.last_name}
                </p>

                {profile?.strava_connected ? (
                  <p className="text-green-600 font-medium">✅ Connected to Strava</p>
                ) : (
                  <button
                    onClick={handleConnectStrava}
                    className="block w-full text-center bg-pink-600 text-white px-3 py-2 rounded-lg hover:bg-pink-700"
                  >
                    Connect to Strava
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* 🟧 Announcement Bar — HIDDEN IN GUEST MODE */}
      {!isGuest && (
        <>
          <div className="fixed top-[56px] left-0 right-0 bg-orange-600 text-white text-sm font-semibold h-[32px] flex items-center justify-center z-30 shadow-md text-center px-4">
            {!eventEnded ? (
              <span>
                🏁 Event Ends Today — Time Left: <strong>{countdown}</strong> ⏰
              </span>
            ) : (
              <span className="text-white animate-pulse">
                🛑 The app is closed for points reconciliation
              </span>
            )}
          </div>

          <div className="h-[35px]" />
        </>
      )}

      {/* 🧭 Stats Drawer (disabled in guest mode) */}
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
