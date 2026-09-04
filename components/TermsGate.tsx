// components/TermsGate.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { TERMS, TERMS_CONSENT_LINE, TERMS_VERSION } from "@/lib/terms";
import { SEASON } from "@/lib/season";

/**
 * Shown after login, before the app is usable, until the person accepts
 * the participation terms. Their acceptance is recorded against the
 * version of the wording they saw.
 *
 * The Agree button stays disabled until the terms have been scrolled to
 * the end AND the box is ticked — so "I didn't see it" isn't available
 * later, and more importantly so the safety points are actually read.
 */
export default function TermsGate({ onAccepted }: { onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // If the whole text already fits without scrolling, don't demand a
  // scroll that isn't possible.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setScrolledToEnd(true);
  }, []);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setScrolledToEnd(true);
    }
  }

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/terms", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't save that. Try again.");
        return;
      }
      onAccepted();
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const ready = checked && scrolledToEnd;

  return (
    <div className="min-h-screen flex flex-col max-w-xl mx-auto w-full px-4 py-6">
      <div className="text-center mb-5">
        <p className="eyebrow text-[10px]">
          Season {String(SEASON.number).padStart(2, "0")}
        </p>
        <h1 className="font-display font-700 uppercase leading-[0.9] text-[30px] mt-1.5">
          Before you
          <br />
          get moving
        </h1>
      </div>

      <div className="bib flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-5 pt-6 pb-4 space-y-4"
        >
          {TERMS.map((t) => (
            <div key={t.heading}>
              <h2 className="font-display font-600 uppercase tracking-wide text-[15px] text-tape">
                {t.heading}
              </h2>
              <p className="text-sm text-chalk-dim leading-relaxed mt-1">
                {t.body}
              </p>
            </div>
          ))}

          <p className="split text-ink-700 pt-2">Version {TERMS_VERSION}</p>
        </div>

        <div className="border-t border-ink-800 px-5 py-4">
          {!scrolledToEnd && (
            <p className="split text-chalk-dim text-center mb-3">
              Scroll to the end to continue
            </p>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => setChecked((v: boolean) => !v)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--tape)]"
            />
            <span className="text-sm text-chalk leading-relaxed">
              {TERMS_CONSENT_LINE}
            </span>
          </label>

          {error && <p className="split text-run mt-3">{error}</p>}

          <button
            onClick={accept}
            disabled={!ready || saving}
            className="w-full mt-4 flex items-center justify-center gap-2
                       bg-tape hover:bg-tape-deep disabled:opacity-35
                       disabled:cursor-not-allowed text-ink-950 py-3 rounded-lg
                       font-display font-700 uppercase tracking-[0.1em] text-[14px]
                       transition-colors"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving
              </>
            ) : (
              <>
                <ShieldCheck size={15} strokeWidth={2.5} />
                I agree
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
