// components/WeightLogger.tsx
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { X, Loader2, Check, Trash2 } from "lucide-react";

/**
 * Log your weight for a given date.
 *
 * Deliberately plain: a date, a number, and your recent entries. No
 * targets, no BMI, no commentary on the number — it's a log, and what
 * it means is the person's own business. Only ever visible to them.
 */
export default function WeightLogger({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [date, setDate] = useState(todayIST);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<{ date: string; weight: number }[]>([]);

  async function loadEntries() {
    try {
      const r = await fetch("/api/weight/get").then((x) => x.json());
      setEntries(r.entries ?? []);
    } catch {
      /* the list is a convenience; failing to load it isn't fatal */
    }
  }

  useEffect(() => {
    if (!open) return;
    setDate(todayIST);
    setWeight("");
    setError(null);
    setSaved(false);
    loadEntries();
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/weight/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, weight }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Couldn't save that.");
        return;
      }

      setSaved(true);
      setWeight("");
      await loadEntries();
      onSaved?.();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(d: string) {
    try {
      await fetch("/api/weight/add", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: d }),
      });
      await loadEntries();
      onSaved?.();
    } catch {
      /* ignore */
    }
  }

  const recent = [...entries].reverse().slice(0, 5);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="Log your weight"
        className="fixed inset-x-4 top-24 z-[61] max-w-sm mx-auto bib px-5 pt-6 pb-5"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-chalk-dim hover:text-chalk hover:bg-ink-800 transition-colors"
        >
          <X size={16} />
        </button>

        <p className="eyebrow text-[10px]">Log your weight</p>
        <p className="split text-chalk-dim mt-1.5 leading-relaxed">
          Only you can see this. It never appears on any leaderboard.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="w-date"
              className="block font-display font-600 uppercase tracking-[0.12em] text-[10px] text-chalk-dim mb-1.5"
            >
              Date
            </label>
            <input
              id="w-date"
              type="date"
              value={date}
              max={todayIST}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
              className="w-full bg-ink-950 border border-ink-800 rounded-lg px-3.5 py-2.5
                         text-chalk focus:border-tape focus:outline-none transition-colors
                         [color-scheme:dark]"
            />
          </div>

          <div>
            <label
              htmlFor="w-kg"
              className="block font-display font-600 uppercase tracking-[0.12em] text-[10px] text-chalk-dim mb-1.5"
            >
              Weight (kg)
            </label>
            <input
              id="w-kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="72.5"
              value={weight}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
              onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && weight ? save() : undefined
              }
              className="w-full bg-ink-950 border border-ink-800 rounded-lg px-3.5 py-2.5
                         text-chalk placeholder:text-ink-700 focus:border-tape
                         focus:outline-none transition-colors"
            />
          </div>

          {error && <p className="split text-run">{error}</p>}

          <button
            onClick={save}
            disabled={saving || !weight}
            className="w-full flex items-center justify-center gap-2 bg-tape hover:bg-tape-deep
                       disabled:opacity-40 text-ink-950 py-2.5 rounded-lg
                       font-display font-700 uppercase tracking-[0.1em] text-[13px]
                       transition-colors"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving
              </>
            ) : saved ? (
              <>
                <Check size={14} strokeWidth={3} />
                Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>

        {recent.length > 0 && (
          <div className="mt-5 pt-4 border-t border-ink-800">
            <p className="eyebrow text-[9px] mb-2">Recent</p>
            <div className="space-y-1.5">
              {recent.map((e) => (
                <div key={e.date} className="flex items-center gap-2">
                  <span className="split text-chalk-dim flex-1">
                    {new Date(`${e.date}T12:00:00+05:30`).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" }
                    )}
                  </span>
                  <span className="readout text-sm">{e.weight.toFixed(1)} kg</span>
                  <button
                    onClick={() => remove(e.date)}
                    aria-label={`Delete entry for ${e.date}`}
                    className="p-1 rounded text-chalk-dim hover:text-run transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
