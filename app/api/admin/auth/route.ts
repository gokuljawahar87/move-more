// app/api/admin/auth/route.ts
import { NextResponse } from "next/server";
import {
  checkPassword,
  makeToken,
  isAdmin,
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** GET — is this session already signed in? */
export async function GET() {
  return NextResponse.json({ authed: await isAdmin() });
}

/** POST — exchange the password for a signed session cookie. */
export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD is not set on the server." },
        { status: 500 }
      );
    }

    if (!checkPassword(String(password ?? ""))) {
      // Deliberately slow, to make guessing tedious
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, makeToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_MAX_AGE,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — sign out. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
