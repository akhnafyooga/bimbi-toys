import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Every /api/admin/* route must call this first. proxy.ts blocks page
// navigation to /admin, but API routes can be hit directly, so the role
// check is enforced again here, server-side, against the DB-backed session.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Akses ditolak. Kamu harus login sebagai admin atau staf." },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}
