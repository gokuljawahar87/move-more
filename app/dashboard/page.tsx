"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isGuest = searchParams?.get("guest") === "true";

  useEffect(() => {
    async function loadProfile() {
      if (isGuest) {
        router.replace("/app?guest=true");
        return;
      }

      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        // ❗ Not part of AAP Team
        if (data?.not_employee) {
          setProfile({ not_employee: true });
          setLoading(false);
          return;
        }

        // No profile at all
        if (!data?.user_id) {
          router.replace("/register");
          return;
        }

        setProfile(data);

        // If profile has Strava connected → go to full app
        if (data?.strava_connected) {
          router.push("/app");
        }
      } catch {
        router.replace("/register");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, isGuest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-950 text-white">
        Loading dashboard...
      </div>
    );
  }

  // ❗ Not part of AAP employee_master
  if (profile?.not_employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-950 text-white p-6 text-center">
        <div className="bg-blue-900 p-8 rounded-2xl shadow-lg max-w-md">
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="mb-4">
            You are not part of the AAP team.<br />
            Please continue in Guest Mode.
          </p>

          <button
            onClick={() => router.replace("/app?guest=true")}
            className="mt-3 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-semibold"
          >
            👀 View as Guest
          </button>
        </div>
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

        {!profile.strava_connected ? (
          <button
            onClick={() =>
              (window.location.href = `/api/strava/connect?user_id=${profile.user_id}`)
            }
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
          >
            Connect to Strava
          </button>
        ) : (
          <p className="text-green-400 font-semibold">Strava already connected ✓</p>
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
