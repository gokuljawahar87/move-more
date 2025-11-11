"use client";

import {
  FaTree,
  FaRunning,
  FaBicycle,
  FaShoePrints,
  FaGlobe,
  FaWalking,
} from "react-icons/fa";

interface StatsProps {
  total_distance: number; // meters
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
 const totalKm = total_distance.toFixed(1);
const cyclingKm = cycling_distance.toFixed(1);
const runningKm = running_distance.toFixed(1);
const walkingKm = walking_distance.toFixed(1);

  const steps = Math.round(Number(walkingKm) * 1312); // approx steps per km
  const co2Saved = (Number(totalKm) * 0.21).toFixed(1); // kg CO2 saved per km

  // Common card style — unified height and consistent layout
  const cardStyle =
    "rounded-2xl shadow-md p-5 flex items-center justify-between bg-gray-50 border border-gray-200 min-h-[120px]";

  const iconSize = "text-4xl";

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Total KM Covered */}
      <div className={`col-span-1 md:col-span-1 lg:col-span-2 ${cardStyle}`}>
        <div>
          <p className="text-gray-600 text-sm">Total KM Covered</p>
          <h2 className="text-3xl font-bold text-gray-900">{totalKm} km</h2>
        </div>
        <FaGlobe className={`${iconSize} text-blue-500`} />
      </div>

      {/* CO2 Saved */}
      <div className="rounded-2xl shadow-md p-5 flex items-center justify-between bg-green-100 text-green-900 border border-green-200 min-h-[120px]">
        <div>
          <p className="text-green-700 text-sm">Kg of CO₂ Saved</p>
          <h2 className="text-3xl font-bold">{co2Saved} kg</h2>
        </div>
        <FaTree className={`${iconSize}`} />
      </div>

      {/* Steps (Walking) */}
      <div className={`${cardStyle} bg-purple-50`}>
        <div>
          <p className="text-gray-600 text-sm">Steps (Walking)</p>
          <h2 className="text-3xl font-bold text-gray-900">
            {steps.toLocaleString()}
          </h2>
        </div>
        <FaShoePrints className={`${iconSize} text-purple-600`} />
      </div>

      {/* KM by Walking */}
      <div className={`${cardStyle} bg-purple-50`}>
        <div>
          <p className="text-gray-600 text-sm">KM by Walking</p>
          <h2 className="text-3xl font-bold text-gray-900">{walkingKm} km</h2>
        </div>
        <FaWalking className={`${iconSize} text-purple-600`} />
      </div>

      {/* KM by Cycling */}
      <div className={cardStyle}>
        <div>
          <p className="text-gray-600 text-sm">KM by Cycling</p>
          <h2 className="text-3xl font-bold text-gray-900">{cyclingKm} km</h2>
        </div>
        <FaBicycle className={`${iconSize} text-orange-500`} />
      </div>

      {/* KM by Running */}
      <div className={cardStyle}>
        <div>
          <p className="text-gray-600 text-sm">KM by Running</p>
          <h2 className="text-3xl font-bold text-gray-900">{runningKm} km</h2>
        </div>
        <FaRunning className={`${iconSize} text-red-500`} />
      </div>
    </div>
  );
}
