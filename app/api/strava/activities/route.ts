import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const cookieStore = cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ error: "No user session found" }, { status: 401 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user_id)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: "Error fetching activities" }, { status: 500 });
    }

    return NextResponse.json({ activities: data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
