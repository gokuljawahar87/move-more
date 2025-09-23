"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1️⃣ Read user_id from cookie
        const cookies = document.cookie.split(";").reduce((acc: any, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {});

        const userId = cookies["user_id"];

        if (!userId) {
          router.push("/register");
          return;
        }

        // 2️⃣ Fetch profile including team
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          console.error("No profile found:", error);
          router.push("/register");
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1433] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1433] text-white">
      <div className="bg-[#112255] p-8 rounded-xl shadow-lg w-[400px] text-center">
        <h1 className="text-2xl font-bold mb-4">
          Welcome, {profile.first_name} {profile.last_name}!
        </h1>
        <p className="mb-4">
          <strong>Team:</strong>{" "}
          {profile.team ? profile.team : "No team assigned"}
        </p>
        {!profile.strava_connected ? (
          <a
            href="/api/strava/auth"
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
          >
            Connect to Strava
          </a>
        ) : (
          <a
            href="/app"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Go to Activities
          </a>
        )}
      </div>
    </div>
  );
}
