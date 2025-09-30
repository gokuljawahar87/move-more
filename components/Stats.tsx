"use client";

import { FaTree, FaRunning, FaBicycle, FaShoePrints, FaGlobe } from "react-icons/fa";

interface StatsProps {
  total_distance: number;   // meters
  cycling_distance: number; // meters
  running_distance: number; // meters
  walking_distance: number; // meters
}

export default function Stats({
  total_distance,
  cycling_distance,
  running_distance,
  walking_distance,
}: StatsProps) {
  const totalKm = (total_distance / 1000).toFixed(1);
  const cyclingKm = (cycling_distance / 1000).toFixed(1);
  const runningKm = (running_distance / 1000).toFixed(1);
  const walkingKm = (walking_distance / 1000).toFixed(1);

  const steps = Math.round(Number(walkingKm) * 1312); // approx steps per km
  const co2Saved = (Number(totalKm) * 0.21).toFixed(1); // kg CO2 saved per km

  // Common card style
  const cardStyle =
    "rounded-2xl shadow-md p-6 flex items-center justify-between bg-gray-50 border border-gray-200";

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Total KM */}
      <div className={`col-span-1 md:col-span-1 lg:col-span-2 ${cardStyle}`}>
        <div>
          <p className="text-gray-600">Total KM Covered</p>
          <h2 className="text-3xl font-bold text-gray-900">{totalKm} km</h2>
        </div>
        <FaGlobe className="text-4xl text-blue-500" />
      </div>

      {/* CO2 Saved */}
      <div className="rounded-2xl shadow-md p-6 flex items-center justify-between bg-green-100 text-green-900 border border-green-200">
        <div>
          <p className="text-green-700">Kg of CO₂ Saved</p>
          <h2 className="text-3xl font-bold">{co2Saved} kg</h2>
        </div>
        <FaTree className="text-4xl" />
      </div>

      {/* Steps from Walking */}
      <div className={cardStyle}>
        <div>
          <p className="text-gray-600">Steps (Walking)</p>
          <h2 className="text-3xl font-bold text-gray-900">
            {steps.toLocaleString()}
          </h2>
        </div>
        <FaShoePrints className="text-4xl text-purple-500" />
      </div>

      {/* Cycling Distance */}
      <div className={cardStyle}>
        <div>
          <p className="text-gray-600">KM by Cycling</p>
          <h2 className="text-3xl font-bold text-gray-900">{cyclingKm} km</h2>
        </div>
        <FaBicycle className="text-4xl text-orange-500" />
      </div>

      {/* Running Distance */}
      <div className={cardStyle}>
        <div>
          <p className="text-gray-600">KM by Running</p>
          <h2 className="text-3xl font-bold text-gray-900">{runningKm} km</h2>
        </div>
        <FaRunning className="text-4xl text-red-500" />
      </div>
    </div>
  );
}
