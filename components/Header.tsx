"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import UserStatsDrawer from "./UserStatsDrawer"; // ✅ use new drawer

export function Header() {
  const [initials, setInitials] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
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
          {/* Hamburger Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded hover:bg-blue-800"
          >
            <Menu size={22} />
          </button>

          <img src="/logo.png" alt="App Logo" className="w-8 h-8 rounded" />
          <h1 className="text-lg font-semibold">AAP – Move-Athon-Mania</h1>
        </div>

        {/* Profile Button */}
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
      </header>

      {/* 🟧 Announcement Bar */}
      <div className="fixed top-[56px] left-0 right-0 bg-orange-500 text-white text-sm font-medium h-[32px] flex items-center justify-center overflow-hidden z-30 shadow-md">
        <div className="animate-marquee whitespace-nowrap hover:[animation-play-state:paused] text-center">
          🏁 Event closes on <strong>Nov 14th</strong> — Keep Moving, Stay Active! 🚴‍♂️🏃‍♀️🚶‍♂️
        </div>
      </div>

      <div className="h-[35px]" />

      {/* 🧭 NEW Stats Drawer */}
      <UserStatsDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userId={profile?.user_id || null}
      />

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .animate-marquee {
          display: inline-block;
          animation: marquee 24s linear infinite;
          padding-left: 100%;
        }
      `}</style>
    </>
  );
}
