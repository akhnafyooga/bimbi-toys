// Bimbi Toys — per-store WhatsApp contacts.
//
// TODO (fill later): replace each `whatsapp` value with the real number in
// international format — digits only, no "+", spaces, or dashes.
// Example: the number 0813-9977-3429 becomes "6281399773429".
// Leaving a value as "62XXXXXXXXXX" simply shows the store as "coming soon".

export type StoreContact = {
  id: string;
  name: string;
  area: string;
  whatsapp: string;
};

export const STORE_CONTACTS: StoreContact[] = [
  { id: "pamularsih", name: "Bimbi Toys Pamularsih", area: "Jl. Pamularsih, Semarang", whatsapp: "62XXXXXXXXXX" },
  { id: "menoreh", name: "Bimbi Toys Menoreh", area: "Jl. Menoreh, Semarang", whatsapp: "62XXXXXXXXXX" },
  { id: "hamka", name: "Bimbi Toys Prof. Dr. Hamka", area: "Jl. Prof. Dr. Hamka, Semarang", whatsapp: "62XXXXXXXXXX" },
  { id: "sekaran", name: "Bimbi Toys Sekaran", area: "Sekaran, Gunungpati, Semarang", whatsapp: "62XXXXXXXXXX" },
  { id: "boja", name: "Bimbi Toys Boja", area: "Boja, Kendal", whatsapp: "62XXXXXXXXXX" },
];

// A number still on the placeholder isn't clickable yet.
export function isContactReady(whatsapp: string) {
  return /^\d{9,15}$/.test(whatsapp);
}

export function waLink(whatsapp: string, message?: string) {
  const base = `https://wa.me/${whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
