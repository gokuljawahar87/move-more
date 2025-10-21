"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface UserStatsDrawerProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function UserStatsDrawer({ open, onClose, userId }: UserStatsDrawerProps) {
  const [stats, setStats] = useState({
    totalActivities: 0,
    activeDays: 0,
    totalKm: 0,
    walkKm: 0,
    runKm: 0,
    cycleKm: 0,
  });

  useEffect(() => {
    if (!userId || !open) return;
    (async () => {
      const res = await fetch(`/api/user/stats?user_id=${userId}`);
      const data = await res.json();
      setStats(data);
    })();
  }, [open, userId]);

  const data = {
    labels: ["Walk", "Run", "Cycle"],
    datasets: [
      {
        data: [stats.walkKm, stats.runKm, stats.cycleKm],
        backgroundColor: ["#a855f7", "#ef4444", "#f97316"],
        borderWidth: 1,
      },
    ],
  };

  import { ChartOptions } from "chart.js";

// ✅ Explicit type ensures build safety
const options: ChartOptions<"pie"> = {
  plugins: {
    legend: {
      display: true,
      position: "bottom", // ✅ valid literal
      labels: {
        usePointStyle: true,
        generateLabels: (chart) => {
          const dataset = chart.data.datasets[0];
          const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
          return chart.data.labels.map((label: any, i: number) => {
            const value = dataset.data[i] as number;
            return {
              text: `${label}: ${value.toFixed(1)} km`,
              fillStyle: dataset.backgroundColor?.[i] || "#000",
              hidden: false,
              index: i,
            };
          });
        },
      },
    },
    tooltip: { enabled: false }, // we show data in legend itself
  },
  cutout: "70%",
};


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl z-50 p-6 overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Stats</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ✕
            </button>
          </div>

          {/* Quick Stats */}
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
          <div className="relative h-64">
            <Pie data={data} options={options} />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xl font-bold text-gray-800">
                {stats.totalKm.toFixed(1)} km
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
