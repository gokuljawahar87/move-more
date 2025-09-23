"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/utils/supabaseClient";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !firstName || !lastName || !email) {
      toast.error("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Lookup team from employee_master
      const { data: emp, error: empError } = await supabase
        .from("employee_master")
        .select("team")
        .eq("user_id", userId.trim())
        .maybeSingle();

      if (empError) {
        console.error("Employee lookup error:", empError);
        toast.error("Error looking up employee.");
        return;
      }

      if (!emp || !emp.team) {
        toast.error("Employee ID not found in master list.");
        return;
      }

      // 2️⃣ Check if already registered
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("access_token")
        .eq("user_id", userId.trim())
        .maybeSingle();

      if (fetchError) {
        console.error("Profile fetch error:", fetchError);
        toast.error("Error checking profile.");
        return;
      }

      if (existing) {
        // already registered → set cookie and redirect
        document.cookie = `user_id=${userId.trim()}; path=/; max-age=31536000`;
        toast.success("Welcome back!");
        if (existing.access_token) {
          router.push("/app");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // 3️⃣ Insert new profile
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          user_id: userId.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          team: emp.team, // ✅ ensure team is inserted
        },
      ]);

      if (insertError) {
        console.error("Insert error:", insertError.message);
        toast.error("Error registering employee.");
        return;
      }

      // 4️⃣ Save cookie and redirect
      document.cookie = `user_id=${userId.trim()}; path=/; max-age=31536000`;
      toast.success("Registration successful!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1a3f] px-4">
      <div className="w-full max-w-md bg-white text-gray-900 rounded-2xl shadow-lg p-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-6">
          AAP – Move-Athon-Mania
          <div className="text-lg font-semibold">Employee Registration</div>
        </h1>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. U262861"
              required
              className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              required
              className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              required
              className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white ${
              loading ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
