"use client";

import { useEffect, useState } from "react";

export function TeamPerformance() {
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [members, setMembers] = useState<any[]>([]);

  // Load list of teams
  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setTeams([]));
  }, []);

  // Load members when team changes
  useEffect(() => {
    if (selectedTeam) {
      fetch(`/api/team-performance?team=${encodeURIComponent(selectedTeam)}`)
        .then((res) => res.json())
        .then((data) => {
          // Ensure it's always an array
          if (Array.isArray(data)) {
            setMembers(data);
          } else if (data && typeof data === "object") {
            setMembers([data]); // wrap single object in array
          } else {
            setMembers([]);
          }
        })
        .catch(() => setMembers([]));
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

          {members.length === 0 ? (
            <p className="text-gray-500 text-sm">No members found.</p>
          ) : (
            <>
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
                  <span>{m.name ?? "Unknown"}</span>
                  <span className="text-center">
                    {Number(m.run || 0).toFixed(1)}
                  </span>
                  <span className="text-center">
                    {Number(m.walk || 0).toFixed(1)}
                  </span>
                  <span className="text-center">
                    {Number(m.cycle || 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
