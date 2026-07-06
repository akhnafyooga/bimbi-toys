import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic role check based on the session cookie/JWT (no DB hit here —
// every admin API route re-checks the role server-side against the DB-backed
// session as the real line of defense; see app/api/admin/*).
export default auth((req) => {
  const role = req.auth?.user?.role;

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (role !== "ADMIN" && role !== "STAFF") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
