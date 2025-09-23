"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function StravaCallback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const exchangeToken = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (!code) {
        toast.error("No authorization code found in URL");
        router.push("/app/dashboard");
        return;
      }

      try {
        const res = await fetch(`/api/strava/token?code=${code}`);
        let data: any = null;

        try {
          data = await res.json();
        } catch {
          toast.error("Strava token response was invalid");
          setLoading(false);
          return;
        }

        if (res.ok && data.access_token) {
          localStorage.setItem("strava_access_token", data.access_token);
          localStorage.setItem("strava_refresh_token", data.refresh_token);
          localStorage.setItem("strava_athlete", JSON.stringify(data.athlete));

          toast.success("✅ Strava connected successfully!");
          router.push("/app/activities");
        } else {
          console.error("❌ Failed to connect with Strava:", data);
          toast.error(`Failed to connect with Strava: ${data.error || "Unknown error"}`);
          router.push("/app/dashboard");
        }
      } catch (err: any) {
        console.error("❌ Error during Strava token exchange:", err);
        toast.error("Server error while connecting to Strava");
        router.push("/app/dashboard");
      } finally {
        setLoading(false);
      }
    };

    exchangeToken();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      {loading ? "⏳ Connecting to Strava..." : "Something went wrong. Check logs."}
    </div>
  );
}
