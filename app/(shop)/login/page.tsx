import Link from "next/link";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: (formData.get("callbackUrl") as string) || "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return; // NextAuth throws NEXT_REDIRECT internally on success; real errors land in ?error=
      }
      throw err;
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <span className="text-5xl">🔑</span>
        <h1 className="font-display text-3xl mt-2 text-bimbi-pink-dark">Masuk Yuk!</h1>
        <p className="text-bimbi-ink/60 mt-1">Biar bisa lihat harga & belanja mainan seru</p>
      </div>

      <div className="rounded-3xl bg-white toy-shelf p-6 sm:p-8">
        <form action={login} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
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
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border-2 border-bimbi-ink/10 px-4 py-2.5 focus:outline-none focus:border-bimbi-pink"
            />
          </div>
          <button className="w-full rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white shadow-[0_4px_0_var(--color-bimbi-pink-dark)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-transform">
            Masuk
          </button>
        </form>
        <p className="text-xs text-center text-bimbi-ink/40 mt-4">
          Demo: demo@bimbitoys.id / bimbi123
        </p>
      </div>

      <p className="text-center mt-6 text-sm text-bimbi-ink/70">
        Belum punya akun?{" "}
        <Link href="/register" className="font-bold text-bimbi-grape hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
