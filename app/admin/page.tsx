// app/admin/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

/**
 * The organiser's desk.
 *
 * Deliberately not the participant app's look. That one is dark and
 * athletic because it's read on a phone between activities; this is a
 * daily triage tool read at a desk, so it's light, dense, and built
 * around a queue rather than a scoreboard.
 */

type Tab = "today" | "review" | "refresh" | "people" | "notices";

const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "review", label: "Review queue" },
  { id: "refresh", label: "Refresh a day" },
  { id: "people", label: "People" },
  { id: "notices", label: "Notices" },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authed))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <Shell>
        <p className="text-chalk-dim">Checking your session…</p>
      </Shell>
    );
  }

  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-ink-950 text-chalk">
      <div className="mx-auto flex max-w-[1180px] gap-8 px-6 py-8">
        <aside className="w-[190px] shrink-0">
          <div className="mb-7">
            <p className="text-[15px] font-semibold leading-tight">
              Move-Athon
            </p>
            <p className="text-[13px] text-chalk-dim">Season 2 desk</p>
          </div>

          <nav className="space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`block w-full rounded-md px-3 py-2 text-left text-[14px] transition-colors ${
                  tab === t.id
                    ? "bg-tape text-ink-950"
                    : "text-chalk-dim hover:bg-ink-800 hover:text-chalk"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <button
            onClick={async () => {
              await fetch("/api/admin/auth", { method: "DELETE" });
              setAuthed(false);
            }}
            className="mt-7 px-3 text-[13px] text-chalk-dim underline underline-offset-4 hover:text-chalk"
          >
            Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          {tab === "today" && <Today onGoto={setTab} />}
          {tab === "review" && <Review />}
          {tab === "refresh" && <RefreshDay />}
          {tab === "people" && <People />}
          {tab === "notices" && <Notices />}
        </main>
      </div>

      <Styles />
    </div>
  );
}

/* ───────────────────────────── Sign in ─────────────────────────── */

function SignIn({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That didn't work.");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="w-full max-w-[320px]">
        <p className="text-[15px] font-semibold">Move-Athon</p>
        <p className="mb-6 text-[13px] text-chalk-dim">Season 2 desk</p>

        <label htmlFor="pw" className="mb-1.5 block text-[13px] text-chalk-dim">
          Password
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          onKeyDown={(e) => e.key === "Enter" && password && submit()}
          className="w-full rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] outline-none focus:border-tape"
        />

        {error && <p className="mt-2 text-[13px] text-run">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || !password}
          className="mt-4 w-full rounded-md bg-tape py-2 text-[14px] font-semibold text-ink-950 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </div>
      <Styles />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 text-chalk">
      {children}
    </div>
  );
}

/* ───────────────────────────── Today ───────────────────────────── */

function Today({ onGoto }: { onGoto: (t: Tab) => void }) {
  const [d, setD] = useState<any>(null);
  const [queue, setQueue] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then(setD);
    fetch("/api/admin/review?status=pending&min=25")
      .then((r) => r.json())
      .then((r) => setQueue(r.total ?? 0));
  }, []);

  if (!d) return <p className="text-chalk-dim">Loading…</p>;

  // The point of this page is what needs doing, so anything that needs
  // doing is stated as a sentence you can act on, not a metric.
  const jobs: { text: string; tone: "warn" | "ok"; go?: Tab }[] = [];

  if (queue && queue > 0)
    jobs.push({
      text: `${queue} ${queue === 1 ? "activity needs" : "activities need"} a look`,
      tone: "warn",
      go: "review",
    });

  if (d.syncAgeMins != null && d.syncAgeMins > 900)
    jobs.push({
      text: `Last sync was ${Math.round(d.syncAgeMins / 60)} hours ago — the scheduled job may have stopped`,
      tone: "warn",
    });

  if (d.notConnected?.length)
    jobs.push({
      text: `${d.notConnected.length} registered but haven't connected Strava`,
      tone: "warn",
      go: "people",
    });

  if (d.notRegistered?.length)
    jobs.push({
      text: `${d.notRegistered.length} on the roster haven't registered`,
      tone: "warn",
      go: "people",
    });

  if (!jobs.length) jobs.push({ text: "Nothing needs you right now", tone: "ok" });

  return (
    <>
      <h1 className="mb-1 text-[22px] font-semibold">Today</h1>
      <p className="mb-6 text-[13px] text-chalk-dim">{d.today}</p>

      <div className="mb-8 overflow-hidden rounded-lg border border-ink-800 bg-ink-900">
        {jobs.map((j, i) => (
          <button
            key={i}
            onClick={() => j.go && onGoto(j.go)}
            disabled={!j.go}
            className={`flex w-full items-center gap-3 border-ink-800 px-4 py-3 text-left text-[14px] ${
              i > 0 ? "border-t" : ""
            } ${j.go ? "hover:bg-ink-800" : "cursor-default"}`}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  j.tone === "warn" ? "var(--tape)" : "var(--walk)",
              }}
            />
            <span className="flex-1">{j.text}</span>
            {j.go && <span className="text-[13px] text-chalk-dim">Open</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Registered" value={d.registered} of={d.roster} />
        <Stat label="Strava connected" value={d.connected} of={d.registered} />
        <Stat label="Terms accepted" value={d.termsAccepted} of={d.registered} />
        <Stat label="Active today" value={d.activeToday} of={d.connected} />
        <Stat label="Activities logged" value={d.totalActivities} />
        <Stat label="Leave days declared" value={d.leaveDeclared} />
        <Stat label="Weeks settled" value={d.weeksSettled} of={8} />
        <Stat
          label="Last sync"
          text={
            d.syncAgeMins == null
              ? "never"
              : d.syncAgeMins < 60
              ? `${d.syncAgeMins}m ago`
              : `${Math.round(d.syncAgeMins / 60)}h ago`
          }
        />
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  of,
  text,
}: {
  label: string;
  value?: number;
  of?: number;
  text?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900 px-4 py-3">
      <p className="mb-1.5 text-[12px] text-chalk-dim">{label}</p>
      {text ? (
        <p className="font-mono text-[17px]">{text}</p>
      ) : (
        <p className="font-mono text-[22px] leading-none">
          {value}
          {of != null && (
            <span className="text-[13px] text-chalk-dim"> / {of}</span>
          )}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────── Review queue ───────────────────────── */

function Review() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setData(null);
    fetch(`/api/admin/review?status=${status}&min=25`)
      .then((r) => r.json())
      .then(setData);
  }, [status]);

  useEffect(load, [load]);

  async function verdict(id: any, v: string) {
    setBusy(String(id));
    await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verdict: v }),
    });
    setData((d: any) => ({
      ...d,
      queue: d.queue.filter((x: any) => x.id !== id),
      total: d.total - 1,
    }));
    setBusy(null);
  }

  return (
    <>
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-[22px] font-semibold">Review queue</h1>
        <div className="flex gap-1 text-[13px]">
          {["pending", "voided", "cleared"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-2.5 py-1 capitalize ${
                status === s ? "bg-tape text-ink-950" : "text-chalk-dim hover:bg-ink-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-6 max-w-[62ch] text-[13px] text-chalk-dim">
        Sorted by how much each one warrants a look. A score is not a
        verdict — most of these turn out to be a forgotten stop button.
      </p>

      {!data ? (
        <p className="text-chalk-dim">Loading…</p>
      ) : data.queue.length === 0 ? (
        <div className="rounded-lg border border-ink-800 bg-ink-900 px-5 py-8 text-center">
          <p className="text-[15px]">Queue is clear</p>
          <p className="mt-1 text-[13px] text-chalk-dim">
            Nothing scored above 25 out of {data.scanned} activities checked.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.queue.map((a: any) => (
            <ReviewRow
              key={a.id}
              a={a}
              busy={busy === String(a.id)}
              onVerdict={verdict}
              status={status}
            />
          ))}
        </div>
      )}

      {data?.overlaps?.length > 0 && (
        <>
          <h2 className="mb-1 mt-10 text-[17px] font-semibold">
            Overlapping activities
          </h2>
          <p className="mb-4 max-w-[62ch] text-[13px] text-chalk-dim">
            Two activities recorded at the same time. Usually a watch and a
            phone both running, occasionally the same session saved twice.
          </p>
          <div className="overflow-hidden rounded-lg border border-ink-800 bg-ink-900">
            {data.overlaps.map((o: any, i: number) => (
              <div
                key={i}
                className={`px-4 py-3 text-[13px] ${
                  i > 0 ? "border-t border-ink-800" : ""
                }`}
              >
                <span className="font-medium">{o.person}</span>
                <span className="text-chalk-dim">
                  {" "}
                  — “{o.a.name}” and “{o.b.name}” overlap by {o.minutes} min
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ReviewRow({
  a,
  busy,
  onVerdict,
  status,
}: {
  a: any;
  busy: boolean;
  onVerdict: (id: any, v: string) => void | Promise<void>;
  status: string;
}) {
  const km = ((Number(a.distance) || 0) / 1000).toFixed(2);
  const mins = Math.round((Number(a.moving_time) || 0) / 60);
  const ist = new Date(a.start_date).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900">
      <div className="flex items-start gap-4 px-4 py-3">
        <div
          className="mt-0.5 w-9 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[15px]"
          style={{
            backgroundColor:
              a.score >= 60
                ? "rgba(255,123,123,0.16)"
                : a.score >= 40
                ? "rgba(255,201,60,0.16)"
                : "var(--ink-800)",
            color:
              a.score >= 60
                ? "var(--run)"
                : a.score >= 40
                ? "var(--tape)"
                : "var(--chalk-dim)",
          }}
        >
          {a.score}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px]">
            <span className="font-medium">{a.person}</span>
            <span className="text-chalk-dim"> · {a.team ?? "no team"}</span>
          </p>
          <p className="truncate text-[13px] text-chalk-dim">
            {a.name} · {a.derived_type || a.type} ·{" "}
            <span className="font-mono">{km} km</span> ·{" "}
            <span className="font-mono">{mins} min</span> · {ist}
          </p>

          <ul className="mt-2 space-y-1">
            {a.flags.map((f: any) => (
              <li key={f.code} className="text-[13px]">
                <span className="font-medium">{f.label}</span>
                <span className="text-chalk-dim"> — {f.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          {a.strava_id && (
            <a
              href={`https://www.strava.com/activities/${a.strava_id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-ink-800 px-2.5 py-1 text-center text-[12px] text-chalk-dim hover:text-chalk"
            >
              Strava
            </a>
          )}

          {status === "pending" ? (
            <>
              <button
                disabled={busy}
                onClick={() => onVerdict(a.id, "void")}
                style={{ backgroundColor: "var(--run)" }}
                className="rounded px-2.5 py-1 text-[12px] font-semibold text-ink-950 disabled:opacity-40"
              >
                Void
              </button>
              <button
                disabled={busy}
                onClick={() => onVerdict(a.id, "clear")}
                className="rounded border border-ink-800 px-2.5 py-1 text-[12px] hover:bg-ink-800 disabled:opacity-40"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              disabled={busy}
              onClick={() => onVerdict(a.id, "reset")}
              className="rounded border border-ink-800 px-2.5 py-1 text-[12px] hover:bg-ink-800 disabled:opacity-40"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Refresh a day ──────────────────────── */

function RefreshDay() {
  const [people, setPeople] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/people")
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []));

    setDate(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    );
  }, []);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/refresh-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, date }),
      });
      setResult(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-[22px] font-semibold">Refresh a day</h1>
      <p className="mb-6 max-w-[62ch] text-[13px] text-chalk-dim">
        Re-pulls one person's activities for one day. Use it after someone
        edits or deletes something on Strava following a review. Anything
        you've already voided or kept stays as you left it.
      </p>

      <div className="max-w-[520px] rounded-lg border border-ink-800 bg-ink-900 p-5">
        <label className="mb-1.5 block text-[13px] text-chalk-dim">Person</label>
        <select
          value={userId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setUserId(e.target.value)
          }
          className="mb-4 w-full rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] outline-none focus:border-tape"
        >
          <option value="">Choose someone…</option>
          {people.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.name} — {p.team ?? "no team"}
            </option>
          ))}
        </select>

        <label className="mb-1.5 block text-[13px] text-chalk-dim">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          className="mb-5 w-full rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] outline-none focus:border-tape"
        />

        <button
          onClick={run}
          disabled={busy || !userId || !date}
          className="rounded-md bg-tape px-4 py-2 text-[14px] font-semibold text-ink-950 disabled:opacity-40"
        >
          {busy ? "Refreshing…" : "Refresh this day"}
        </button>
      </div>

      {result && (
        <div className="mt-5 max-w-[520px] rounded-lg border border-ink-800 bg-ink-900 p-5">
          {result.error ? (
            <p className="text-[14px] text-run">{result.error}</p>
          ) : (
            <>
              <p className="text-[14px]">
                {result.person} · {result.date}
              </p>
              <p className="mt-1 text-[13px] text-chalk-dim">
                {result.updated} updated, {result.deleted} removed,{" "}
                {result.fetchedFromStrava} found on Strava
                {result.skippedLocked > 0 &&
                  ` · ${result.skippedLocked} left as reviewed`}
              </p>

              {result.activities?.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-ink-800 pt-3">
                  {result.activities.map((a: any, i: number) => (
                    <li key={i} className="text-[13px]">
                      <span className="font-mono">{a.km} km</span>
                      <span className="text-chalk-dim">
                        {" "}
                        · {a.mins} min · {a.type} · {a.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ───────────────────────────── People ──────────────────────────── */

function People() {
  const [people, setPeople] = useState<any[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/people")
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []));
  }, []);

  if (!people) return <p className="text-chalk-dim">Loading…</p>;

  const shown = people.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.team ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-[22px] font-semibold">People</h1>
        <input
          value={q}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          placeholder="Find someone"
          className="w-[220px] rounded-md border border-ink-800 bg-ink-900 px-3 py-1.5 text-[14px] outline-none focus:border-tape"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-ink-800 bg-ink-900">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-800 text-left text-chalk-dim">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Team</th>
              <th className="px-3 py-2 text-right font-medium">Points</th>
              <th className="px-3 py-2 text-right font-medium">km</th>
              <th className="px-3 py-2 text-right font-medium">Streak</th>
              <th className="px-3 py-2 text-right font-medium">Activities</th>
              <th className="px-4 py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p, i) => (
              <tr key={p.user_id} className={i > 0 ? "border-t border-ink-800" : ""}>
                <td className="px-4 py-2">
                  {p.name}
                  {!p.connected && (
                    <span className="ml-2 rounded px-1.5 py-0.5 text-[11px] text-tape">
                      no Strava
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-chalk-dim">{p.team ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{p.points}</td>
                <td className="px-3 py-2 text-right font-mono">{p.km}</td>
                <td className="px-3 py-2 text-right font-mono">{p.streak}</td>
                <td className="px-3 py-2 text-right font-mono text-chalk-dim">
                  {p.counted}
                </td>
                <td className="px-4 py-2 text-chalk-dim">
                  {p.lastActivity
                    ? new Date(p.lastActivity).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "short",
                      })
                    : "never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ───────────────────────────── Notices ─────────────────────────── */

function Notices() {
  const [list, setList] = useState<any[] | null>(null);
  const [kicker, setKicker] = useState("Announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/announce")
      .then((r) => r.json())
      .then((d) => setList(d.announcements ?? []));
  }, []);

  useEffect(load, [load]);

  async function post() {
    setBusy(true);
    try {
      await fetch("/api/admin/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kicker, title, body }),
      });
      setTitle("");
      setBody("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function retire(id: any) {
    await fetch("/api/admin/announce", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <>
      <h1 className="mb-1 text-[22px] font-semibold">Notices</h1>
      <p className="mb-6 max-w-[62ch] text-[13px] text-chalk-dim">
        Everyone sees a notice once, as a pop-up, the next time they open the
        app. Use it for rule changes and new features, not for chatter.
      </p>

      <div className="mb-8 max-w-[560px] rounded-lg border border-ink-800 bg-ink-900 p-5">
        <label className="mb-1.5 block text-[13px] text-chalk-dim">Label</label>
        <input
          value={kicker}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setKicker(e.target.value)}
          className="mb-4 w-full rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] outline-none focus:border-tape"
        />

        <label className="mb-1.5 block text-[13px] text-chalk-dim">Headline</label>
        <input
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Late-night activity no longer counts"
          className="mb-4 w-full rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] outline-none focus:border-tape"
        />

        <label className="mb-1.5 block text-[13px] text-chalk-dim">Message</label>
        <textarea
          value={body}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
          rows={4}
          placeholder="Anything between 11pm and 3:30am won't be scored. No leaderboard is worth an unlit road at that hour."
          className="mb-4 w-full resize-y rounded-md border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] outline-none focus:border-tape"
        />

        <button
          onClick={post}
          disabled={busy || !title || !body}
          className="rounded-md bg-tape px-4 py-2 text-[14px] font-semibold text-ink-950 disabled:opacity-40"
        >
          {busy ? "Posting…" : "Post notice"}
        </button>
      </div>

      {list && list.length > 0 && (
        <div className="max-w-[560px] overflow-hidden rounded-lg border border-ink-800 bg-ink-900">
          {list.map((a: any, i: number) => (
            <div
              key={a.id}
              className={`px-4 py-3 ${i > 0 ? "border-t border-ink-800" : ""} ${
                a.active ? "" : "opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{a.title}</p>
                  <p className="mt-0.5 text-[13px] text-chalk-dim">{a.body}</p>
                  <p className="mt-1.5 text-[12px] text-chalk-dim">
                    Seen by <span className="font-mono">{a.seenBy}</span>
                    {!a.active && " · retired"}
                  </p>
                </div>
                {a.active && (
                  <button
                    onClick={() => retire(a.id)}
                    className="shrink-0 rounded border border-ink-800 px-2.5 py-1 text-[12px] text-chalk-dim hover:text-chalk"
                  >
                    Retire
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ───────────────────────────── Styles ──────────────────────────── */

function Styles() {
  return (
    <style jsx global>{`
      /* The console reuses the app's palette, so a figure looks the
         same here as it does on someone's phone. Only the layout
         differs: this is read at a desk, so it's denser and quieter.

         Note the app's globals.css maps .bg-white onto a dark surface
         for the Season 1 components still on the compatibility layer.
         That's why this page uses the ink tokens directly rather than
         white — a white card here would come out dark with dark text
         on it. */
      .font-mono {
        font-family: var(--font-mono), ui-monospace, monospace;
        font-variant-numeric: tabular-nums;
      }
      /* Native pickers default to a light chrome that looks broken on
         a dark surface. */
      input[type="date"] {
        color-scheme: dark;
      }
      select option {
        background-color: var(--ink-900);
        color: var(--chalk);
      }
      :focus-visible {
        outline: 2px solid var(--tape);
        outline-offset: 2px;
        border-radius: 4px;
      }
    `}</style>
  );
}
