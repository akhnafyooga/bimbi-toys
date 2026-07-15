// Bimbi Toys — store WhatsApp contact helpers.
//
// Store data (name, address, phone) lives in ONE place: the StoreLocation
// table, edited from the admin panel (Admin → Stok Toko). Pages that need a
// contact list fetch it there and map it into this shape — there is no
// hardcoded store list anymore, so footer/checkout/product pages can't drift
// apart. A store whose phone is empty or invalid simply shows "Segera hadir".

export type StoreContact = {
  id: string;
  name: string;
  area: string;
  whatsapp: string; // normalized international format, e.g. "6281399773429", or "" when not set
};

// A store without a usable number isn't clickable yet.
export function isContactReady(whatsapp: string) {
  return /^\d{9,15}$/.test(whatsapp);
}

export function waLink(whatsapp: string, message?: string) {
  const base = `https://wa.me/${whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
