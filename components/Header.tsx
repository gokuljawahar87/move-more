"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function Header() {
  const [initials, setInitials] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [weight, setWeight] = useState("");
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([]);
  const [saving, setSaving] = useState(false);

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

  // 💾 Save Weight
  const handleSaveWeight = async () => {
    if (!selectedDate || !weight || !profile?.user_id) return alert("Please select a date and weight");

    try {
      setSaving(true);
      const res = await fetch("/api/weight/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile.user_id,
          date: selectedDate,
          weight: parseFloat(weight),
        }),
      });

      if (!res.ok) throw new Error("Failed to save weight");
      alert("✅ Weight saved successfully");
      setWeight("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save weight");
    } finally {
      setSaving(false);
    }
  };

  // 📊 Fetch Weight Trend
  const handleViewTrend = async () => {
    if (!profile?.user_id) return;
    try {
      const res = await fetch(`/api/weight/get?user_id=${profile.user_id}`);
      const data = await res.json();
      if (Array.isArray(data)) setWeights(data);
      setShowTrend(true);
    } catch (err) {
      console.error("Failed to fetch trend", err);
    }
  };

  return (
    <>
      {/* 🔷 Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-blue-900 text-white shadow-md fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded hover:bg-blue-800"
          >
            <Menu size={22} />
          </button>
          <img src="/logo.png" alt="App Logo" className="w-8 h-8 rounded" />
          <h1 className="text-lg font-semibold">AAP – Move-Athon-Mania</h1>
        </div>

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

      {/* ⚖️ Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50">
          <div className="absolute top-0 left-0 w-80 h-full bg-white text-gray-900 shadow-xl p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">⚖️ Weight Tracker</h2>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setShowTrend(false);
                }}
                className="text-gray-500 hover:text-black text-lg"
              >
                ✕
              </button>
            </div>

            {/* 🗓️ Date Picker */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            {/* ⚖️ Weight Input */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            {/* Buttons */}
            <button
              onClick={handleSaveWeight}
              disabled={saving}
              className="w-full bg-blue-600 text-white rounded-lg py-2 mb-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "💾 Save Weight"}
            </button>

            <button
              onClick={handleViewTrend}
              className="w-full bg-gray-200 text-gray-800 rounded-lg py-2 hover:bg-gray-300"
            >
              📊 View Trend
            </button>

            {/* 📈 Weight Chart */}
            {showTrend && weights.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-2 text-gray-800">
                  Weight Progress
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weights}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

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
