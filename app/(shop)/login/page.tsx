import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import BrandLogo from "@/components/BrandLogo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const cb = (formData.get("callbackUrl") as string) || "/";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: cb,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        // Wrong email or password — bounce back to the form with a visible warning.
        redirect(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(cb)}`);
      }
      throw err; // NEXT_REDIRECT on success must propagate
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      {/* Walmart-style minimal centered form */}
      <div className="text-center mb-8 flex flex-col items-center gap-4">
        <BrandLogo variant="full" height={44} className="text-slate-400" />
        <h1 className="text-2xl font-extrabold text-bimbi-ink">Masuk atau buat akunmu</h1>
        <p className="text-sm text-slate-500 -mt-2 max-w-xs">
          Masukkan email dan password untuk lihat harga &amp; belanja mainan seru.
        </p>
      </div>

      <div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-wm-red/30 px-4 py-3 text-sm font-semibold text-wm-red animate-pop-in">
            ⚠️ Gagal masuk. Email atau password salah — periksa lagi ya. Belum punya akun?{" "}
            <Link href="/register" className="underline font-bold">
              Daftar dulu di sini
            </Link>
            .
          </div>
        )}
        <form action={login} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          <div>
            <label className="text-sm font-extrabold text-bimbi-ink">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="kamu@email.com"
              className="mt-1 w-full rounded-lg border border-slate-400 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-bimbi-pink"
            />
          </div>
          <div>
            <label className="text-sm font-extrabold text-bimbi-ink">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-400 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-bimbi-pink"
            />
          </div>
          <p className="text-xs text-slate-400">
            Keamanan data pribadimu adalah prioritas kami.
          </p>
          <button className="w-full rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-6 py-3 font-extrabold text-white transition-colors chip-spring">
            Masuk
          </button>
        </form>
        <p className="text-xs text-center text-slate-400 mt-4">
          Demo: demo@bimbitoys.id / bimbi123
        </p>
      </div>

      <div className="mt-8 rounded-lg bg-bimbi-sun p-5 text-center">
        <p className="font-extrabold text-bimbi-ink">Belum punya akun?</p>
        <Link
          href="/register"
          className="mt-3 inline-block rounded-full border border-bimbi-ink px-6 py-2 text-sm font-extrabold text-bimbi-ink hover:bg-white transition-colors chip-spring"
        >
          Daftar sekarang
        </Link>
      </div>
    </div>
  );
}
