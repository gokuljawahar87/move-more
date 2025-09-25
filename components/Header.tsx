"use client";

import { useEffect, useState } from "react";

export function Header() {
  const [initials, setInitials] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;

        const profile = await res.json();
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

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-blue-900 text-white shadow-md fixed top-0 left-0 right-0 z-40">
      {/* App title */}
      <div className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="App Logo"
          className="w-8 h-8 rounded"
        />
        <h1 className="text-lg font-semibold">AAP – Move-Athon-Mania</h1>
      </div>

      {/* User initials circle */}
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black font-bold shadow">
        {initials || "?"}
      </div>
    </header>
  );
}
