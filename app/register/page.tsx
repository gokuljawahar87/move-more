"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/utils/supabaseClient";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [userId, setUserId] = useState(""); // Employee ID
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 🔎 Lookup employee in employee_master
      const { data: emp, error: empError } = await supabase
        .from("employee_master")
        .select("team")
        .eq("user_id", userId) // ⚠️ adjust if your field is different
        .maybeSingle();

      if (empError) {
        console.error("Employee lookup error:", empError.message);
        toast.error("Error fetching employee details.");
        return;
      }

      if (!emp) {
        toast.error("Invalid Employee ID. Please check and try again.");
        return;
      }

      // 🔎 Check if already registered
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("user_id, access_token")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Fetch error:", fetchError.message);
        toast.error("Something went wrong.");
        return;
      }

      if (existing) {
        // Already registered → redirect appropriately
        if (existing.access_token) {
          router.push("/app");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // 📝 Insert into profiles
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          team: emp.team, // from employee_master
        },
      ]);

      if (insertError) {
        console.error("Insert error:", insertError.message);
        toast.error("Error registering employee.");
        return;
      }

      toast.success("Registered successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 text-white px-4">
      <form
        onSubmit={handleRegister}
        className="bg-white text-gray-900 p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        {/* Page Title */}
        <h1 className="text-xl font-bold text-blue-900 text-center">
          AAP – Move-Athon-Mania <br /> Employee Registration
        </h1>

        {/* Employee ID */}
        <input
          type="text"
          placeholder="Employee ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        {/* First Name */}
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        {/* Last Name */}
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        {/* Work Email */}
        <input
          type="email"
          placeholder="Work Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800"
        >
          Register
        </button>
      </form>
    </div>
  );
}
