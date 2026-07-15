// Indonesian phone number normalization for WhatsApp links.
//
// Buyers type numbers every way imaginable: "0812-3456-7890", "+62 812 3456 7890",
// "812 3456 7890". wa.me links only work with the international digits-only
// form ("628123456790"), so everything is normalized to that — or null when the
// input can't be a valid Indonesian mobile number.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let normalized: string | null = null;
  if (digits.startsWith("62")) normalized = digits;
  else if (digits.startsWith("0")) normalized = "62" + digits.slice(1);
  else if (digits.startsWith("8")) normalized = "62" + digits;
  if (!normalized) return null;
  // 62 + 9-13 digits covers all Indonesian mobile numbers
  return /^62\d{9,13}$/.test(normalized) ? normalized : null;
}

// Pretty display form for a normalized number: "62812…" -> "0812-3456-7890"-ish
export function displayPhone(phone62: string): string {
  return "0" + phone62.slice(2);
}
