// move-more/app/activities/page.tsx
"use client";

import { Activities } from "@/components/Activities";

export default function ActivitiesPage() {
  return (
    <div className="min-h-screen bg-[#0a1430] text-white">
      {/* Page header */}
      <div className="bg-[#111c44] px-4 py-3 shadow-md">
        <h1 className="text-xl font-bold">Activities</h1>
      </div>

      {/* Activities list */}
      <Activities />
    </div>
  );
}
