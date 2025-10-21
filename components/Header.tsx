"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";
import { FaWalking, FaRunning, FaBicycle } from "react-icons/fa";

ChartJS.register(ArcElement, Tooltip, Legend);

export function Header() {
  const [initials, setInitials] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

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

  // 🔹 Fetch user stats when sidebar opens
  useEffect(() => {
    if (!sidebarOpen || !profile?.user_id) return;
    (async () => {
      try {
        const res = await fetch(`/api/user/stats?user_id=${profile.user_id}`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch user stats:", err);
      }
    })();
  }, [sidebarOpen, profile]);

  const handleConnectStrava = () => {
    if (!profile?.user_id) return;
    window.location.href = `/api/strava/connect?user_id=${profile.user_id}`;
  };

  // 🎯 Chart Data
  const data: ChartData<"pie", number[], string> = {
    labels: [
      `Walk (${(stats?.walkKm ?? 0).toFixed(1)} km)`,
      `Run (${(stats?.runKm ?? 0).toFixed(1)} km)`,
      `Cycle (${(stats?.cycleKm ?? 0).toFixed(1)} km)`,
    ],
    datasets: [
      {
        data: [stats?.walkKm ?? 0, stats?.runKm ?? 0, stats?.cycleKm ?? 0],
        backgroundColor: ["#a855f7", "#ef4444", "#f97316"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  // 🎨 Chart Options
  const options: ChartOptions<"pie"> = {
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#333",
          font: { size: 12 },
          boxWidth: 15,
          padding: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}`,
        },
      },
    },
    cutout: "70%",
    maintainAspectRatio: false,
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

      {/* 🧭 Stats Sidebar Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-50"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute top-0 left-0 w-80 h-full bg-white text-gray-900 shadow-xl p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📊 Your Activity Stats</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-black text-lg"
              >
                ✕
              </button>
            </div>

            {stats ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium">Active Days</span>
                    <span className="font-semibold">{stats.activeDays}</span>
                  </div>
                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium">Total Activities</span>
                    <span className="font-semibold">{stats.totalActivities}</span>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="relative w-64 h-64 mx-auto flex items-center justify-center mb-8">
                  <Pie data={data} options={options} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xl font-bold text-gray-900 text-center leading-none">
                      {stats.totalKm.toFixed(1)} km
                    </p>
                  </div>
                </div>

                {/* 🧩 Longest Activities */}
                <h3 className="text-md font-semibold mb-3 text-gray-800 text-center">
                  🏅 Longest Activities
                </h3>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between bg-purple-100 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-purple-700">
                      <FaWalking size={20} />
                      <span>Longest Walk</span>
                    </div>
                    <span className="font-semibold">
                      {stats.longestWalk ? `${stats.longestWalk.toFixed(2)} km` : "No activity"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-orange-100 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-orange-700">
                      <FaBicycle size={20} />
                      <span>Longest Cycle</span>
                    </div>
                    <span className="font-semibold">
                      {stats.longestCycle ? `${stats.longestCycle.toFixed(2)} km` : "No activity"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-red-100 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-red-700">
                      <FaRunning size={20} />
                      <span>Longest Run</span>
                    </div>
                    <span className="font-semibold">
                      {stats.longestRun ? `${stats.longestRun.toFixed(2)} km` : "No activity"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center mt-10">
                Loading stats...
              </p>
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
