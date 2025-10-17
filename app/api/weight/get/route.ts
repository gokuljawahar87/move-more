// app/api/weight/get/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function GET(req: Request) {
try {
const url = new URL(req.url);
const user_id = url.searchParams.get("user_id");
if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });


const { data, error } = await supabaseAdmin
.from("weight_logs")
.select("date, weight")
.eq("user_id", user_id)
.order("date", { ascending: true });


if (error) {
console.error("Supabase fetch error (weight_logs):", error);
return NextResponse.json({ error: error.message }, { status: 500 });
}


return NextResponse.json(data || []);
} catch (err: any) {
console.error("/api/weight/get error:", err);
return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
}
}