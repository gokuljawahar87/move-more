"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Eye, ArrowRight } from "lucide-react";
import { SEASON } from "@/lib/season";

const FIELDS = [
  { name: "user_id", label: "Employee ID", type: "text", autoComplete: "username" },
  { name: "first_name", label: "First Name", type: "text", autoComplete: "given-name" },
  { name: "last_name", label: "Last Name", type: "text", autoComplete: "family-name" },
  { name: "email", label: "Work Email", type: "email", autoComplete: "email" },
] as const;

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

      document.cookie = `user_id=${formData.user_id}; path=/; max-age=${
        60 * 60 * 24 * 7
      };`;

      toast.success("You're in. Let's move.");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error.message);
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => router.push("/app?guest=true");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {/* ── Masthead ────────────────────────────────────────────
            The season number is set large and treated as the bib
            number it is — the biggest thing on the screen. */}
        <div className="text-center mb-7">
          <p className="eyebrow text-[10px] mb-2">AAP Presents</p>

          <h1 className="font-display font-700 uppercase leading-[0.88] tracking-tight text-[42px]">
            Move-Athon
            <br />
            Mania
          </h1>

          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="h-px w-10 bg-ink-700" />
            <span className="font-display font-600 uppercase tracking-[0.2em] text-tape text-sm">
              Season {String(SEASON.number).padStart(2, "0")}
            </span>
            <span className="h-px w-10 bg-ink-700" />
          </div>
        </div>

        {/* ── Entry form, styled as a bib ──────────────────────── */}
        <div className="bib px-6 pt-7 pb-6">
          <p className="eyebrow text-[10px] mb-4">Claim your bib</p>

          <form onSubmit={handleRegister} className="space-y-3.5">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label
                  htmlFor={f.name}
                  className="block font-display font-600 uppercase tracking-[0.12em] text-[10px] text-chalk-dim mb-1.5"
                >
                  {f.label}
                </label>
                <input
                  id={f.name}
                  type={f.type}
                  name={f.name}
                  autoComplete={f.autoComplete}
                  value={formData[f.name]}
                  onChange={handleChange}
                  required
                  className="w-full bg-ink-950 border border-ink-800 rounded-lg px-3.5 py-2.5
                             text-chalk placeholder:text-ink-700
                             focus:border-tape focus:outline-none transition-colors"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2
                         bg-tape hover:bg-tape-deep disabled:opacity-60
                         text-ink-950 py-3 rounded-lg
                         font-display font-700 uppercase tracking-[0.1em] text-[15px]
                         transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Registering
                </>
              ) : (
                <>
                  Register
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Guest route ─────────────────────────────────────── */}
        <div className="mt-5 text-center">
          <p className="text-sm text-chalk-dim mb-2.5">
            Just want a look around?
          </p>
          <button
            onClick={handleGuestAccess}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                       border border-ink-800 hover:border-ink-700 hover:bg-ink-900
                       font-display font-600 uppercase tracking-[0.1em] text-[13px]
                       text-chalk-dim hover:text-chalk transition-colors"
          >
            <Eye size={14} />
            View as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
