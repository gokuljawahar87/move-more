"use client";

import { useEffect, useState } from "react";
import { User, Footprints, Medal, Users, BarChart3, Trophy, Swords } from "lucide-react";
import { showChampions } from "@/lib/season";

type Tab =
  | "activities"
  | "leaderboard"
  | "you"
  | "challenges"
  | "teams"
  | "stats"
  | "championship";

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  /** Guests have no personal page, so the You tab is hidden for them */
  isGuest?: boolean;
};

const TABS: {
  id: Tab;
  label: string;
  Icon: typeof Footprints;
  /** Only revealed once the season has ended */
  finaleOnly?: boolean;
}[] = [
  { id: "you", label: "You", Icon: User },
  { id: "activities", label: "Feed", Icon: Footprints },
  { id: "leaderboard", label: "Ranks", Icon: Medal },
  { id: "challenges", label: "Weekly", Icon: Swords },
  { id: "teams", label: "Teams", Icon: Users },
  { id: "stats", label: "Stats", Icon: BarChart3 },
  { id: "championship", label: "Champions", Icon: Trophy, finaleOnly: true },
];

export default function BottomNav({
  activeTab,
  setActiveTab,
  isGuest = false,
}: Props) {
  // Resolved after mount rather than during render. The server and the
  // browser can sit either side of the season end, and a mismatch there
  // would cause a hydration error.
  const [finaleUnlocked, setFinaleUnlocked] = useState(false);

  useEffect(() => {
    setFinaleUnlocked(showChampions());
  }, []);

  // Safety net: if someone is parked on Champions when it locks (or the
  // tab is restored from a previous session), move them somewhere valid.
  useEffect(() => {
    if (!finaleUnlocked && activeTab === "championship") {
      setActiveTab("leaderboard");
    }
  }, [finaleUnlocked, activeTab, setActiveTab]);

  const visibleTabs = TABS.filter(
    (t) =>
      (!t.finaleOnly || finaleUnlocked) && !(isGuest && t.id === "you")
  );

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-ink-800"
      style={{
        backgroundColor: "var(--ink-950)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex justify-around items-stretch max-w-2xl mx-auto px-1 py-2">
        {visibleTabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={active ? "page" : undefined}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              <span
                className={`flex items-center justify-center h-7 w-[44px] rounded-full transition-colors duration-200 ${
                  active ? "bg-tape" : "bg-transparent group-hover:bg-ink-800"
                }`}
              >
                <Icon
                  size={17}
                  strokeWidth={active ? 2.5 : 1.9}
                  className={active ? "text-ink-950" : "text-chalk-dim"}
                />
              </span>

              <span
                className={`font-display uppercase tracking-[0.09em] text-[9px] leading-none transition-colors ${
                  active ? "text-tape font-700" : "text-chalk-dim font-500"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
