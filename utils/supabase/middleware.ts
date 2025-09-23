import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, type NextResponse } from "next/server";

export function createClient(req: NextRequest, res: NextResponse) {
  return createMiddlewareClient({ req, res }, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
}
