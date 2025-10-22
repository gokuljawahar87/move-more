"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from "chart.js";
import { FaRunning, FaShoePrints, FaBicycle, FaMedal, FaTrophy, FaUsers } from "react-icons/fa";

ChartJS.register(ArcElement, Tooltip, Legend);

interface UserStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function UserStatsDrawer({ isOpen, onClose, userId }: UserStatsDrawerProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user stats when opened
  useEffect(() => {
    if (!isOpen || !userId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/stats?user_id=${userId}`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch user stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, userId]);

  // 🧩 Chart setup
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

  const options: ChartOptions<"pie"> = {
    layout: { padding: { top: 0, bottom: 0 } },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          boxWidth: 16,
          boxHeight: 10,
          padding: 10,
          font: { size: 12 },
          generateLabels: (chart) => {
            const dataset = chart.data.datasets[0];
            const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
            return chart.data.labels!.map((label: any, i: number) => {
              const value = dataset.data[i] as number;
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
              return {
                text: `${label} – ${value.toFixed(1)} km (${percent}%)`,
                fillStyle: dataset.backgroundColor![i] as string,
                strokeStyle: dataset.backgroundColor![i] as string,
                hidden: false,
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
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar Drawer */}
          <motion.div
            className="fixed top-0 left-0 w-80 h-full bg-white text-gray-900 shadow-xl p-6 overflow-y-auto z-50"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📊 Your Activity Stats</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">
                ✕
              </button>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 mt-10">Loading stats...</p>
            ) : stats ? (
              <>
                {/* Activity Summary */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium">Active Days</span>
                    <span className="font-semibold">{stats.activeDays}</span>
                  </div>

                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium">Total Activities</span>
                    <span className="font-semibold">{stats.totalActivities}</span>
                  </div>

                  {/* 🏅 Total Points */}
                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium flex items-center gap-2">
                      <FaMedal className="text-yellow-500" /> Total Points
                    </span>
                    <span className="font-semibold">{Math.round(stats.totalPoints)}</span>
                  </div>

                  {/* 👥 Team Rank */}
                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium flex items-center gap-2">
                      <FaTrophy className="text-blue-600" /> Team Position
                    </span>
                    <span className="font-semibold">
                      {stats.teamRank ? `#${stats.teamRank}` : "-"}
                    </span>
                  </div>

                  {/* 🌍 Overall Rank */}
                  <div className="flex justify-between text-gray-800">
                    <span className="font-medium flex items-center gap-2">
                      <FaUsers className="text-green-600" /> Overall Position
                    </span>
                    <span className="font-semibold">
                      {stats.overallRank ? `#${stats.overallRank}` : "-"}{" "}
                      <span className="text-gray-500 text-sm">
                        / {stats.totalParticipants || 0}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 🥧 Pie Chart (Truly Centered with Plugin) */}
<div className="relative flex flex-col items-center mt-6">
  <div className="relative w-60 h-60">
    <Pie
      data={data}
      options={{
        ...options,
        layout: { padding: 0 },
        cutout: "75%",
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            align: "center",
            labels: {
              boxWidth: 14,
              boxHeight: 10,
              padding: 12,
              font: { size: 12 },
              generateLabels: (chart) => {
                const dataset = chart.data.datasets[0];
                const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
                return chart.data.labels!.map((label: any, i: number) => {
                  const value = dataset.data[i] as number;
                  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                  return {
                    text: `${label} – ${value.toFixed(1)} km (${percent}%)`,
                    fillStyle: dataset.backgroundColor![i] as string,
                    strokeStyle: dataset.backgroundColor![i] as string,
                    hidden: false,
                  };
                });
              },
            },
          },
          tooltip: { enabled: false },
        },
      }}
      plugins={[
        {
          id: "centerText",
          afterDraw: (chart) => {
            const { ctx, chartArea } = chart;
            if (!chartArea || !stats?.totalKm) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;

            ctx.save();
            ctx.font = "bold 18px sans-serif";
            ctx.fillStyle = "#111827";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${stats.totalKm.toFixed(1)} km`, centerX, centerY);
            ctx.restore();
          },
        },
      ]}
    />
  </div>
</div>


                {/* 🏃 Longest Activities */}
                <div className="grid gap-3 mt-8">
                  <div className="p-3 rounded-xl shadow bg-gray-50 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-gray-700">
                      <FaShoePrints className="text-purple-500" /> Longest Walk
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.longestWalk ? `${stats.longestWalk.toFixed(1)} km` : "No activity"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl shadow bg-gray-50 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-gray-700">
                      <FaRunning className="text-red-500" /> Longest Run
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.longestRun ? `${stats.longestRun.toFixed(1)} km` : "No activity"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl shadow bg-gray-50 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-gray-700">
                      <FaBicycle className="text-orange-500" /> Longest Cycle
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.longestCycle ? `${stats.longestCycle.toFixed(1)} km` : "No activity"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center mt-10">No stats available.</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
