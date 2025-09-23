import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const cookieStore = cookies();
  const user_id = cookieStore.get("user_id")?.value;

  if (!user_id) {
    return NextResponse.json({ error: "No user session found" }, { status: 401 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", user_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No tokens found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
