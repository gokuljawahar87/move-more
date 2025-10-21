"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { FaWalking, FaBicycle, FaRunning } from "react-icons/fa";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function UserStatsDrawer({ sidebarOpen, onClose, profile }: any) {
  const [stats, setStats] = useState<any>(null);

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

  const data = {
    labels: ["Walk", "Run", "Cycle"],
    datasets: [
      {
        data: [stats?.walkKm ?? 0, stats?.runKm ?? 0, stats?.cycleKm ?? 0],
        backgroundColor: ["#a855f7", "#ef4444", "#f97316"],
        borderWidth: 1,
      },
    ],
  };

  // ✅ Chart options with typed legend showing values
  const options: ChartOptions<"pie"> = {
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          generateLabels: (chart) => {
            const dataset = chart.data.datasets[0];
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
            return chart.data.labels.map((label: any, i: number) => {
              const value = dataset.data[i] as number;
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
              return {
                text: `${label}: ${value.toFixed(1)} km (${percent}%)`,
                fillStyle: dataset.backgroundColor?.[i] || "#000",
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      tooltip: { enabled: false },
    },
    cutout: "70%",
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-40 z-50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute top-0 left-0 w-80 h-full bg-white text-gray-900 shadow-xl p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📊 Your Activity Stats</h2>
              <button
                onClick={onClose}
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
                <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                  <Pie data={data} options={options} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xl font-bold text-gray-900 text-center leading-none">
                      {stats.totalKm.toFixed(1)} km
                    </p>
                  </div>
                </div>

                {/* Longest activities section */}
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl bg-purple-100 text-purple-900 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <FaWalking className="text-2xl" />
                      <span className="font-semibold">Longest Walk</span>
                    </div>
                    <span>{stats.longestWalk ? `${stats.longestWalk.toFixed(1)} km` : "—"}</span>
                  </div>

                  <div className="rounded-xl bg-red-100 text-red-900 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <FaRunning className="text-2xl" />
                      <span className="font-semibold">Longest Run</span>
                    </div>
                    <span>{stats.longestRun ? `${stats.longestRun.toFixed(1)} km` : "—"}</span>
                  </div>

                  <div className="rounded-xl bg-orange-100 text-orange-900 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <FaBicycle className="text-2xl" />
                      <span className="font-semibold">Longest Ride</span>
                    </div>
                    <span>{stats.longestCycle ? `${stats.longestCycle.toFixed(1)} km` : "—"}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center mt-10">
                Loading stats...
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
