// app/api/weight/add/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function POST(req: Request) {
try {
const body = await req.json();
const { user_id, date, weight } = body || {};


if (!user_id || !date || (weight === undefined || weight === null)) {
return NextResponse.json({ error: "Missing user_id, date or weight" }, { status: 400 });
}


// upsert on (user_id, date)
const payload = {
user_id: String(user_id),
date: date, // expect YYYY-MM-DD
weight: Number(weight),
updated_at: new Date().toISOString(),
};


const { error } = await supabaseAdmin
.from("weight_logs")
.upsert(payload, { onConflict: ["user_id", "date"] });


if (error) {
console.error("Supabase upsert error (weight_logs):", error);
return NextResponse.json({ error: error.message }, { status: 500 });
}


return NextResponse.json({ success: true });
} catch (err: any) {
console.error("/api/weight/add error:", err);
return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
}
}