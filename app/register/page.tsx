"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/utils/supabaseClient"; // keep the path matching your project
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
    if (!userId.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      // 1) check employee_master for team
      const { data: emp, error: empError } = await supabase
        .from("employee_master")
        .select("team")
        .eq("user_id", userId.trim())
        .maybeSingle();

      if (empError) {
        console.error("Employee lookup error:", empError);
        toast.error("Error looking up employee. Try again.");
        return;
      }

      if (!emp) {
        toast.error("Employee ID not found in master list.");
        return;
      }

      // 2) check if profile already exists
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("access_token")
        .eq("user_id", userId.trim())
        .maybeSingle();

      if (fetchError) {
        console.error("Profile fetch error:", fetchError);
        toast.error("Error checking existing profile.");
        return;
      }

      if (existing) {
        // already registered: set cookie and redirect appropriately
        document.cookie = `user_id=${userId.trim()}; path=/; max-age=${60 * 60 * 24 * 365}`;
        toast.success("Welcome back!");
        if (existing.access_token) router.push("/app");
        else router.push("/dashboard");
        return;
      }

      // 3) insert into profiles with team from employee_master
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          user_id: userId.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          team: emp.team ?? null,
        },
      ]);

      if (insertError) {
        console.error("Insert error:", insertError.message);
        toast.error("Error registering employee.");
        return;
      }

      // 4) set cookie and redirect to dashboard
      document.cookie = `user_id=${userId.trim()}; path=/; max-age=${60 * 60 * 24 * 365}`;
      toast.success("Registration successful!");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1a3f] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-gray-900">
          {/* Visible title with strong contrast */}
          <h1 className="text-center text-2xl font-extrabold text-blue-900 mb-6">
            AAP – Move-Athon-Mania
            <div className="text-lg font-semibold">Employee Registration</div>
          </h1>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                id="userId"
                name="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="E.g. U262861"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="family-name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white ${
                loading ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Processing…" : "Register"}
            </button>
          </form>
        </div>

        {/* small hint */}
        <p className="text-center text-sm text-gray-300 mt-4">
          Already registered? <a className="text-blue-300 underline" href="/dashboard">Go to dashboard</a>
        </p>
      </div>
    </div>
  );
}
