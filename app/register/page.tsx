"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    user_id: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Error registering employee.");
        return;
      }

      // ✅ Save user_id in cookie
      document.cookie = `user_id=${formData.user_id}; path=/; max-age=${
        60 * 60 * 24 * 7
      };`; // 7 days expiry

      toast.success("Registration successful!");
      router.push("/dashboard"); // redirect to dashboard
    } catch (error: any) {
      console.error("Registration error:", error.message);
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A1633]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-center text-[#0A1633] mb-4">
          AAP – Move-Athon-Mania <br />
          Employee Registration
        </h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            name="user_id"
            placeholder="Employee ID"
            value={formData.user_id}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded text-black"
          />
          <input
            type="text"
            name="first_name"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded text-black"
          />
          <input
            type="text"
            name="last_name"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded text-black"
          />
          <input
            type="email"
            name="email"
            placeholder="Work Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded text-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
