"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Processing login...");
  const [expired, setExpired] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Extract tokens from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          // ❌ No tokens = expired or invalid link
          setExpired(true);
          setMessage("Link expired ❌ Please request a new OTP.");
          return;
        }

        // ✅ Set Supabase session manually
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setMessage("Error: " + error.message);
          return;
        }

        if (data?.session) {
          setMessage("Login successful ✅ Redirecting...");

          // Save profile (from localStorage)
          const firstName = localStorage.getItem("firstName");
          const lastName = localStorage.getItem("lastName");

          if (firstName && lastName) {
            await supabase.from("profiles").upsert({
              id: data.session.user.id,
              email: data.session.user.email,
              first_name: firstName,
              last_name: lastName,
            });

            localStorage.removeItem("firstName");
            localStorage.removeItem("lastName");
          }

          setTimeout(() => router.push("/dashboard"), 1500);
        }
      } catch (err: any) {
        setMessage("Unexpected error: " + err.message);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center flex-col">
      <p className="text-lg mb-4">{message}</p>

      {expired && (
        <button
          onClick={() => router.push("/register")}
          className="bg-blue-600 text-white p-2 rounded"
        >
          Request New OTP
        </button>
      )}
    </div>
  );
}
