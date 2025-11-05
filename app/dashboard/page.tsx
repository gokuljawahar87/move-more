"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Detect guest mode (just like the app page)
  const isGuest = searchParams?.get("guest") === "true";

  useEffect(() => {
    async function loadProfile() {
      if (isGuest) {
        // Guest mode → skip fetching & go straight to app guest view
        router.replace("/app?guest=true");
        return;
      }

      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("No profile");
        const data = await res.json();
        setProfile(data);

        // If they already connected Strava → jump to app
        if (data?.strava_id) {
          router.push("/app");
        }
      } catch (err) {
        // No profile → send to Register
        router.replace("/register");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router, isGuest]);

  const handleConnectToStrava = () => {
    const userId = profile?.user_id;
    if (!userId) return toast.error("Missing user ID");
    window.location.href = `/api/strava/connect?user_id=${encodeURIComponent(userId)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
        Loading dashboard...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
        No profile found. Please register.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
      <div className="bg-blue-900 p-8 rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {profile.first_name} {profile.last_name}!
        </h1>
        <p className="mb-4">Team: {profile.team ?? "Not Assigned"}</p>

        {!profile.strava_id ? (
          <button
            onClick={handleConnectToStrava}
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
          >
            Connect to Strava
          </button>
        ) : (
          <p className="text-green-400 font-semibold">
            Strava already connected ✓ Redirecting...
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
