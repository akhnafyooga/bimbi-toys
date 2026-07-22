import { prisma } from "@/lib/prisma";

export default async function StoresPage() {
  const stores = await prisma.storeLocation.findMany({ orderBy: { city: "asc" } });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-2">Toko Bimbi Terdekat </h1>
      <p className="text-bimbi-ink/60 mb-8">
        Nggak mau nunggu kiriman? Ambil langsung mainanmu di salah satu toko kami!
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        {stores.map((s) => (
          <div key={s.id} className="rounded-2xl bg-white toy-shelf p-5">
            <p className="font-display text-lg text-bimbi-grape">{s.name}</p>
            <p className="text-sm text-bimbi-ink/70 mt-1">{s.address}</p>
            <p className="text-sm text-bimbi-ink/50 mt-1"> {s.city}</p>
            {s.phone && <p className="text-sm text-bimbi-ink/50"> {s.phone}</p>}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-3 text-sm font-bold text-bimbi-pink-dark hover:underline"
            >
              Buka di Google Maps →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
