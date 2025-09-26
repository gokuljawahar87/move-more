"use client";

import { useEffect, useState } from "react";

export function Header() {
  const [initials, setInitials] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
    // ✅ Redirect user to Strava auth flow with their user_id
    window.location.href = `/api/strava/auth?user_id=${profile.user_id}`;
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-blue-900 text-white shadow-md fixed top-0 left-0 right-0 z-40">
      {/* App title */}
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="App Logo" className="w-8 h-8 rounded" />
        <h1 className="text-lg font-semibold">AAP – Move-Athon-Mania</h1>
      </div>

      {/* User initials circle + popup */}
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
              <p className="text-green-600 font-medium">
                ✅ Connected to Strava
              </p>
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
  );
}
