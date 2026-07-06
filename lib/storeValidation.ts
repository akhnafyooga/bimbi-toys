export type StoreInput = {
  name?: string;
  city?: string;
  address?: string;
  lat?: number | string;
  lng?: number | string;
  phone?: string;
};

export function validateStoreInput(body: StoreInput) {
  const name = String(body.name ?? "").trim();
  const city = String(body.city ?? "").trim();
  const address = String(body.address ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Nama toko belum diisi.";
  if (!city) errors.city = "Kota belum diisi.";
  if (!address) errors.address = "Alamat belum diisi.";
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.lat = "Koordinat latitude tidak valid.";
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.lng = "Koordinat longitude tidak valid.";

  return { name, city, address, phone, lat, lng, errors };
}
