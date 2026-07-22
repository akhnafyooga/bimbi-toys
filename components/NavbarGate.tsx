"use client";

import { usePathname } from "next/navigation";

// Hides the main site header on focused auth screens (login) so they read as
// a clean, chrome-light page. Everything else shows the header as normal.
const HEADERLESS_PATHS = ["/login"];

export default function NavbarGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (HEADERLESS_PATHS.includes(pathname)) return null;
  return <>{children}</>;
}
