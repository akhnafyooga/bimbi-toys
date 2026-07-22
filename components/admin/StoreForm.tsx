"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField, { inputClass } from "@/components/admin/FormField";

type StoreData = {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
};

export default function StoreForm({ store }: { store?: StoreData }) {
  const router = useRouter();
  const isEdit = !!store;

  const [name, setName] = useState(store?.name ?? "");
  const [city, setCity] = useState(store?.city ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [lat, setLat] = useState(store ? String(store.lat) : "");
  const [lng, setLng] = useState(store ? String(store.lng) : "");
  const [phone, setPhone] = useState(store?.phone ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "Nama toko belum diisi.";
    if (!city.trim()) fieldErrors.city = "Kota belum diisi.";
    if (!address.trim()) fieldErrors.address = "Alamat belum diisi.";
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!lat || !Number.isFinite(latNum) || latNum < -90 || latNum > 90) fieldErrors.lat = "Koordinat latitude tidak valid.";
    if (!lng || !Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) fieldErrors.lng = "Koordinat longitude tidak valid.";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setBanner({ type: "error", message: "Ada isian yang belum benar. Periksa lagi ya." });
      return;
    }

    setErrors({});
    setPending(true);

    const payload = { name: name.trim(), city: city.trim(), address: address.trim(), phone: phone.trim(), lat: latNum, lng: lngNum };
    const res = await fetch(isEdit ? `/api/admin/stores/${store!.id}` : "/api/admin/stores", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrors(data.fields ?? {});
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan toko. Coba lagi ya." });
      return;
    }

    setBanner({ type: "success", message: " Toko berhasil disimpan" });
    setTimeout(() => router.push("/admin/stok-toko"), 700);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      <FormField label="Nama Toko" error={errors.name}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bimbi Toys Dago" className={inputClass} />
      </FormField>

      <FormField label="Kota" error={errors.city}>
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Contoh: Bandung" className={inputClass} />
      </FormField>

      <FormField label="Alamat Lengkap" error={errors.address}>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Jl. Ir. H. Djuanda No. 88" className={inputClass} />
      </FormField>

      <FormField label="Nomor Telepon" optional>
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812-3456-7890" className={inputClass} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Latitude"
          hint="Buka Google Maps, klik kanan lokasi toko, salin angka pertama."
          error={errors.lat}
        >
          <input type="text" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-6.914744" className={inputClass} />
        </FormField>
        <FormField
          label="Longitude"
          hint="Angka kedua dari koordinat yang sama."
          error={errors.lng}
        >
          <input type="text" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="107.609810" className={inputClass} />
        </FormField>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-md transition-colors cursor-pointer"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" onClick={() => router.push("/admin/stok-toko")} className="text-slate-500 hover:text-slate-700 font-semibold text-sm cursor-pointer">
          Batal
        </button>
      </div>
    </form>
  );
}
