"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Trophy, Medal, Users } from "lucide-react";

type LeaderboardData = {
  runners: Array<{ name: string; team: string }>;
  walkers: Array<{ name: string; team: string }>;
  cyclers: Array<{ name: string; team: string }>;
  teams: Array<{ team: string; points: number }>;
  topFemales?: any[];
};

type TeamPerfMember = { name: string; run: number; walk: number; cycle: number; points: number };
type TeamPerfRow = { teamName: string; totalPoints: number; members: TeamPerfMember[] };

const medalColors = [
  "bg-gradient-to-r from-yellow-400 to-yellow-600",
  "bg-gradient-to-r from-gray-400 to-gray-500",
  "bg-gradient-to-r from-amber-700 to-amber-800",
];

// 🧠 Team Logo Mapper
const getLogoPath = (team: string) => {
  if (!team) return "/logos/default.png";
  const normalized = team.toLowerCase().replace(/\s+/g, "").trim();
  const logoMap: Record<string, string> = {
    alpha: "alpha.png",
    brigade: "brigade.png",
    crusaders: "crusaders.png",
    goat: "goat.png",
    powerhouse: "powerhouse.png",
    rackets: "rackets.png",
    rockers: "rockers.png",
    vibe: "vibe.png",
  };
  const match = Object.keys(logoMap).find((key) => normalized.includes(key));
  return match ? `/logos/${logoMap[match]}` : "/logos/default.png";
};

const ORG_BONUS_TEAM = "Corporate Crusaders";
const ORG_BONUS_POINTS = 100;
const PARTICIPATION_PER_MEMBER = 5;

const PointsChampions: React.FC = () => {
  const [lb, setLb] = useState<LeaderboardData | null>(null);
  const [teamsPerf, setTeamsPerf] = useState<TeamPerfRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [lbRes, tpRes] = await Promise.all([
          fetch("/api/leaderboard"),
          fetch("/api/team-performance"),
        ]);
        const [lbJson, tpJson] = await Promise.all([lbRes.json(), tpRes.json()]);

        const tpArr: TeamPerfRow[] = Array.isArray(tpJson)
          ? tpJson
          : Array.isArray(tpJson?.teams)
          ? tpJson.teams
          : [];

        if (!active) return;
        setLb(lbJson ?? null);
        setTeamsPerf(tpArr);
      } catch (err) {
        console.error("Failed to load championship dashboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const teamPoints = [500, 250, 100];
  const categoryPoints = [300, 200, 100];

  // 🟡 Top Teams (based on leaderboard ranking)
  const teamScores = useMemo(() => {
    return (lb?.teams || []).slice(0, 3).map((t, i) => ({
      team: t.team,
      team_logo: getLogoPath(t.team),
      points: teamPoints[i] || 0,
    }));
  }, [lb]);

  // 🏅 Individual category winners
  const categoryWinners = [
    { category: "Running", emoji: "🏃‍♂️", list: lb?.runners || [] },
    { category: "Walking", emoji: "🚶‍♂️", list: lb?.walkers || [] },
    { category: "Cycling", emoji: "🚴‍♀️", list: lb?.cyclers || [] },
  ];

  // 👥 Participation points calculated from team-performance API
  const participationRows = useMemo(() => {
    if (!teamsPerf) return [];
    return teamsPerf.map((t) => {
      const count = (t.members || []).filter((m) => (m.points || 0) > 0).length;
      return {
        team: t.teamName,
        logo: getLogoPath(t.teamName),
        count,
        points: count * PARTICIPATION_PER_MEMBER,
      };
    }).sort((a, b) => b.points - a.points);
  }, [teamsPerf]);

  // ✅ FINAL FIX — Recalculate total points cleanly (no double counting)
  const overallWithExtras = useMemo(() => {
    if (!lb) return { top3: [], all: [] };

    const totals: Record<string, number> = {};

    // 1️⃣ Team Rank Points
    lb.teams.slice(0, 3).forEach((t, i) => {
      totals[t.team] = (totals[t.team] || 0) + (teamPoints[i] || 0);
    });

    // 2️⃣ Individual Winner Points
    categoryWinners.forEach(({ list }) => {
      list.slice(0, 3).forEach((person, i) => {
        totals[person.team] = (totals[person.team] || 0) + (categoryPoints[i] || 0);
      });
    });

    // 3️⃣ Participation Points
    participationRows.forEach((p) => {
      totals[p.team] = (totals[p.team] || 0) + p.points;
    });

    // 4️⃣ Organizer bonus
    totals[ORG_BONUS_TEAM] = (totals[ORG_BONUS_TEAM] || 0) + ORG_BONUS_POINTS;

    const all = Object.entries(totals)
      .map(([team, points]) => ({
        team,
        points,
        logo: getLogoPath(team),
      }))
      .sort((a, b) => b.points - a.points);

    return { top3: all.slice(0, 3), all };
  }, [lb, participationRows]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );

  if (!lb) return <p className="text-center text-gray-300">No data available</p>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white p-4 md:p-8 space-y-10">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold flex justify-center items-center gap-2">
          🏆 Championship Dashboard
        </h1>
        <p className="text-gray-400 text-sm md:text-base mt-1">
          Celebrating the best of the Move More Challenge
        </p>
      </div>

      {/* 🎖 Overall Champions */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-xl border border-yellow-600 bg-gradient-to-b from-yellow-100/10 to-yellow-300/5 p-6"
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-yellow-400 flex justify-center items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Overall Champions
        </h2>

        <div className="flex flex-col md:flex-row justify-center gap-6">
          {overallWithExtras.top3.map((t, i) => (
            <motion.div
              key={t.team}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.2 }}
              className={`relative flex flex-col items-center justify-center w-full md:w-1/3 py-6 px-4 rounded-xl ${medalColors[i]} text-center shadow-lg`}
            >
              {i === 0 && (
                <div className="absolute inset-0 rounded-xl border-4 border-yellow-400 animate-pulse opacity-40 blur-lg"></div>
              )}
              <div className="relative z-10">
                <div className="text-4xl mb-2">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                <img src={t.logo} className="w-14 h-14 rounded-full border-2 border-white mx-auto mb-2 bg-white object-contain" />
                <h3 className="text-lg font-bold">{t.team}</h3>
                <p className="text-sm mt-1 text-gray-200">{t.points} pts</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 🏅 Winners Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-md border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-6"
      >
        <h2 className="text-xl font-bold mb-6 text-center text-yellow-400 flex justify-center items-center gap-2">
          <Medal className="w-5 h-5 text-yellow-500" /> Winners Breakdown
        </h2>

        {/* Top Teams */}
        <h3 className="font-semibold mt-2 mb-4 text-yellow-300 text-lg flex items-center gap-2">
          🧑‍🤝‍🧑 Top Teams
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {teamScores.map((team, idx) => (
            <motion.div
              key={team.team}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className={`relative flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 border border-gray-700 rounded-xl py-5 shadow-md ${
                idx === 0 ? "border-yellow-400" : ""
              }`}
            >
              {idx === 0 && (
                <div className="absolute inset-0 rounded-xl border-2 border-yellow-400 animate-pulse opacity-30 blur-md"></div>
              )}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="text-3xl">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</div>
                <img
                  src={team.team_logo}
                  alt={team.team}
                  className="w-12 h-12 rounded-full bg-white object-contain border border-white/50 shadow"
                />
                <h4 className="font-bold text-white text-sm mt-1">{team.team}</h4>
                <p className="text-yellow-300 text-sm font-semibold">{team.points} pts</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Top Individual Contributors */}
        <h3 className="font-semibold mt-2 mb-4 text-yellow-300 text-lg flex items-center gap-2">
          🏃 Top Individual Contributors
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categoryWinners.map(({ category, emoji, list }) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-b from-indigo-950 to-indigo-900 rounded-xl p-4 shadow-lg border border-indigo-700 text-white"
            >
              <h4 className="flex items-center gap-2 text-lg font-semibold mb-4 text-yellow-400">
                {emoji} Top {category}s
              </h4>

              <div className="flex flex-col space-y-3">
                {list.slice(0, 3).map((person: any, idx: number) => (
                  <div
                    key={`${category}-${idx}-${person.name}`}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 transition ${
                      idx === 0
                        ? "bg-yellow-100/10 border border-yellow-500 animate-pulse"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-2xl ${
                          idx === 0
                            ? "text-yellow-400"
                            : idx === 1
                            ? "text-gray-300"
                            : "text-amber-600"
                        }`}
                      >
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                      </div>

                      <img
                        src={getLogoPath(person.team)}
                        alt={person.team}
                        className="w-8 h-8 rounded-full border border-white/40 bg-white object-contain"
                      />

                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">{person.name}</span>
                        <span className="text-xs text-gray-400">{person.team}</span>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-yellow-300">
                      {categoryPoints[idx]} pts
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Participation Points */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-md border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-6"
      >
        <h2 className="text-xl font-bold mb-6 text-center text-yellow-400 flex justify-center items-center gap-2">
          <Users className="w-5 h-5 text-yellow-500" /> Participation Points
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {participationRows.map((row, idx) => (
            <div
              key={row.team}
              className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl p-5 border border-gray-700 shadow"
            >
              <div className="flex items-center gap-3">
                <img
                  src={row.logo}
                  alt={row.team}
                  className="w-10 h-10 rounded-full bg-white object-contain border border-white/40"
                />
                <div>
                  <div className="font-semibold">{row.team}</div>
                  <div className="text-xs text-gray-400">{row.count} participants</div>
                </div>
                <div className="ml-auto text-yellow-300 font-semibold">{row.points} pts</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Organizer Bonus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-md border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-6"
      >
        <h2 className="text-xl font-bold mb-6 text-center text-yellow-400">Organizer Bonus</h2>
        <div className="flex items-center justify-center gap-4 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl p-5 border border-gray-700">
          <img
            src={getLogoPath(ORG_BONUS_TEAM)}
            alt={ORG_BONUS_TEAM}
            className="w-10 h-10 rounded-full bg-white object-contain border border-white/40"
          />
          <div className="text-center">
            <div className="font-semibold">{ORG_BONUS_TEAM}</div>
            <div className="text-yellow-300 font-semibold">+{ORG_BONUS_POINTS} pts</div>
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default PointsChampions;
