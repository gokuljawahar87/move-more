"use client";

import { useEffect, useState } from "react";
import supabase from "@utils/supabaseClient";
import Link from "next/link";

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  team: string;
  strava_connected: boolean;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, team, strava_connected")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) return <p className="text-white p-6">Loading...</p>;

  if (!profile) return <p className="text-white p-6">No profile found. Please register.</p>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">
        Welcome, {profile.first_name} {profile.last_name}!
      </h1>
      <p className="mb-4">Team: {profile.team}</p>

      {profile.strava_connected ? (
        <Link href="/activities">
          <button className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded">
            Go to Activities
          </button>
        </Link>
      ) : (
        <a
          href={`https://www.strava.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback&scope=read,activity:read_all&state=${profile.user_id}`}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded inline-block"
        >
          Connect to Strava
        </a>
      )}
    </div>
  );
}
