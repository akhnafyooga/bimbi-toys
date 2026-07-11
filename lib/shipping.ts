// Indonesian shipping cost estimation.
//
// Stage 1: rough distance-tier mock so checkout works end-to-end locally
// without needing an API key.
//
// Stage 2: replace the body of `getShippingOptions` with a real call to
// RajaOngkir / Komerce Shipping Cost API using RAJAONGKIR_API_KEY from .env.
// Example (Komerce "Cost" endpoint):
//
//   const res = await fetch("https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost", {
//     method: "POST",
//     headers: { key: process.env.RAJAONGKIR_API_KEY!, "content-type": "application/x-www-form-urlencoded" },
//     body: new URLSearchParams({ origin, destination, weight: String(weight), courier }),
//   });

export type ShippingOption = {
  courier: string;
  service: string;
  cost: number;
  etaDays: string;
};

const COURIERS = [
  { courier: "JNE", service: "REG", baseRate: 9000, perKgRate: 4000, etaDays: "2-3 hari" },
  { courier: "JNE", service: "YES", baseRate: 18000, perKgRate: 6000, etaDays: "1 hari" },
  { courier: "SiCepat", service: "BEST", baseRate: 8000, perKgRate: 3800, etaDays: "1-2 hari" },
  { courier: "AnterAja", service: "REG", baseRate: 7500, perKgRate: 3500, etaDays: "2-4 hari" },
];

// crude same-province / cross-island multiplier based on city name matching
// (placeholder logic — replace with real origin/destination district IDs)
function distanceMultiplier(destinationCity: string) {
  const nearby = ["jakarta", "bekasi", "depok", "tangerang", "bogor", "semarang", "bandung"];
  const isNearby = nearby.some((c) => destinationCity.toLowerCase().includes(c));
  return isNearby ? 1 : 1.8;
}

export async function getShippingOptions(destinationCity: string, weightGrams: number): Promise<ShippingOption[]> {
  const weightKg = Math.max(1, Math.ceil(weightGrams / 1000));
  const mult = distanceMultiplier(destinationCity);

  return COURIERS.map((c) => ({
    courier: c.courier,
    service: c.service,
    cost: Math.round((c.baseRate + c.perKgRate * weightKg) * mult / 500) * 500,
    etaDays: c.etaDays,
  }));
}
