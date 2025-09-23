"use client";

import { useEffect, useState } from "react";

export function TeamPerformance() {
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [members, setMembers] = useState<any[]>([]);

  // Load list of teams (could come from employee_master or profiles)
  useEffect(() => {
    fetch("/api/teams") // we’ll make this small API or hardcode for now
      .then((res) => res.json())
      .then((data) => setTeams(data));
  }, []);

  // Load members when team changes
  useEffect(() => {
    if (selectedTeam) {
      fetch(`/api/team-performance?team=${encodeURIComponent(selectedTeam)}`)
        .then((res) => res.json())
        .then(setMembers);
    }
  }, [selectedTeam]);

  return (
    <div className="p-4 space-y-6 bg-blue-950 min-h-screen text-white">
      {/* Dropdown */}
      <div>
        <label className="block mb-2 text-sm font-medium">Select Team</label>
        <select
          className="w-full p-2 rounded-lg text-gray-900"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          <option value="">-- Choose a team --</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Members table */}
      {selectedTeam && (
        <div className="bg-white text-gray-900 rounded-xl shadow-md p-4">
          <h2 className="text-lg font-bold mb-3">{selectedTeam} Members</h2>
          <div className="grid grid-cols-4 font-semibold border-b pb-2 mb-2">
            <span>Name</span>
            <span className="text-center">Run (km)</span>
            <span className="text-center">Walk (km)</span>
            <span className="text-center">Cycle (km)</span>
          </div>
          {members.map((m, i) => (
            <div
              key={i}
              className="grid grid-cols-4 py-2 border-b last:border-b-0 text-sm"
            >
              <span>{m.name}</span>
              <span className="text-center">{m.run.toFixed(1)}</span>
              <span className="text-center">{m.walk.toFixed(1)}</span>
              <span className="text-center">{m.cycle.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
