"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      {children}
    </button>
  );
}