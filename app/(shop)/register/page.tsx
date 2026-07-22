"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Gagal daftar. Coba lagi ya.");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl mt-2 text-bimbi-pink-dark">Gabung Bimbi Toys</h1>
        <p className="text-bimbi-ink/60 mt-1">Daftar gratis, langsung bisa belanja!</p>
      </div>

      <div className="rounded-3xl bg-white toy-shelf p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold">Nama</label>
            <input
              name="name"
              required
              placeholder="Nama kamu"
              className="mt-1 w-full rounded-xl border-2 border-bimbi-ink/10 px-4 py-2.5 focus:outline-none focus:border-bimbi-pink"
            />
          </div>
          <div>
            <label className="text-sm font-bold">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="kamu@email.com"
              className="mt-1 w-full rounded-xl border-2 border-bimbi-ink/10 px-4 py-2.5 focus:outline-none focus:border-bimbi-pink"
            />
          </div>
          <div>
            <label className="text-sm font-bold">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              className="mt-1 w-full rounded-xl border-2 border-bimbi-ink/10 px-4 py-2.5 focus:outline-none focus:border-bimbi-pink"
            />
          </div>
          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-6 py-3 font-extrabold text-white transition-colors chip-spring disabled:opacity-50"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>
      </div>

      <p className="text-center mt-6 text-sm text-bimbi-ink/70">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-bold text-bimbi-grape hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
