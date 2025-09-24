"use client";

type Props = {
  activeTab: "activities" | "leaderboard" | "teams";
  setActiveTab: (tab: "activities" | "leaderboard" | "teams") => void;
};

export default function BottomNav({ activeTab, setActiveTab }: Props) {
  return (
    <div className="fixed bottom-4 inset-x-0 flex justify-center z-50">
      <div className="flex justify-around bg-pink-200 text-gray-800 rounded-2xl px-6 py-3 shadow-lg w-[90%] max-w-md">
        <button
          onClick={() => setActiveTab("activities")}
          className={`flex flex-col items-center ${
            activeTab === "activities" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined">home</span>
          <span className="text-xs">Activities</span>
        </button>

        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex flex-col items-center ${
            activeTab === "leaderboard" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined">emoji_events</span>
          <span className="text-xs">Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab("teams")}
          className={`flex flex-col items-center ${
            activeTab === "teams" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <span className="material-symbols-outlined">groups</span>
          <span className="text-xs">Teams</span>
        </button>
      </div>
    </div>
  );
}
