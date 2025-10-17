// components/WeightDrawer.tsx
if (userId) loadTrend();
}, [open]);


async function save() {
if (!userId) return setToast("Please login first");
if (!date || weight === "") return setToast("Please select date and enter weight");
const w = Number(weight);
if (Number.isNaN(w) || w <= 0) return setToast("Enter a valid weight");


try {
setLoading(true);
const res = await fetch("/api/weight/add", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ user_id: userId, date, weight: w }),
});
const body = await res.json();
if (!res.ok) throw body;
setToast("Saved");
await loadTrend();
} catch (err) {
console.error(err);
setToast("Save failed");
} finally {
setLoading(false);
setTimeout(() => setToast(null), 2500);
}
}


async function loadTrend() {
if (!userId) return;
try {
const q = new URLSearchParams({ user_id: userId });
const res = await fetch(`/api/weight/get?${q.toString()}`);
const data = await res.json();
if (!res.ok) throw data;
setTrend((data || []).map((d: any) => ({ date: d.date, weight: Number(d.weight) })));
} catch (err) {
console.error("Failed load trend", err);
setTrend([]);
}
}


return (
<div
className={`fixed inset-y-0 left-0 w-full sm:w-96 bg-white text-black z-50 transform transition-transform duration-300 shadow-lg ${open ? "translate-x-0" : "-translate-x-full"}`}
>
<div className="p-4 border-b flex items-center justify-between">
<h3 className="font-semibold">My Weight Tracker</h3>
<div className="flex items-center gap-2">
<button onClick={loadTrend} className="text-sm text-blue-600">Refresh</button>
<button onClick={onClose} className="px-2 py-1 rounded bg-gray-200">Close</button>
</div>
</div>


<div className="p-4 space-y-4">
<div className="flex flex-col gap-1">
<label className="text-sm text-gray-600">Date</label>
<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1" />
</div>


<div className="flex flex-col gap-1">
<label className="text-sm text-gray-600">Weight (kg)</label>
<input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="border rounded px-2 py-1" placeholder="e.g. 72.5" />
</div>


<div className="flex gap-2">
<button onClick={save} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
{loading ? "Saving..." : "Save"}
</button>
<button onClick={loadTrend} className="bg-gray-100 px-4 py-2 rounded">View Trend</button>
</div>


{toast && <div className="text-sm text-green-600">{toast}</div>}


<div>
<h4 className="text-sm font-semibold mb-2">Weight Trend</h4>
{trend === null && <p className="text-sm text-gray-500">Open drawer to load trend</p>}
{trend && trend.length === 0 && <p className="text-sm text-gray-500">No entries yet</p>}
{trend && trend.length > 0 && <WeightTrendChart data={trend} />}
</div>
</div>
</div>
);
}