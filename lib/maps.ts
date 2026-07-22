// Build a Google Maps link that drops a pin at the store's coordinates.
// Matches the format the /stores page has always used, so every store link
// across the site behaves identically.
export function googleMapsUrl(store: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;
}
