"use client";

import { useState } from "react";
import supabase from "@/utils/supabaseClient";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !firstName || !lastName || !email) {
      toast.error("Please fill all fields.");
      return;
    }

    // check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existingUser) {
      toast.success("Welcome back!");
      // Save user_id in cookie
      document.cookie = `user_id=${userId}; path=/; max-age=31536000`;
      // if strava not connected, go to dashboard
      if (!existingUser.access_token) {
        router.push("/dashboard");
      } else {
        router.push("/app");
      }
      return;
    }

    // insert new user
    const { error } = await supabase.from("profiles").insert([
      {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
      },
    ]);

    if (error) {
      console.error("Insert error:", error.message);
      toast.error("Error registering employee.");
      return;
    }

    // save cookie
    document.cookie = `user_id=${userId}; path=/; max-age=31536000`;

    toast.success("Registration successful!");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1a3f]">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          AAP – Move-Athon-Mania Employee Registration
        </h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Employee ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="email"
            placeholder="Work Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
