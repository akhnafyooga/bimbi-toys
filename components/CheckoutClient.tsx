"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatIDR } from "@/lib/format";
import type { ShippingOption } from "@/lib/shipping";

type Store = { id: string; name: string; city: string; address: string };
type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  city: string;
  province: string;
  district: string;
  postalCode: string;
  detail: string;
};
type CartItem = {
  id: string;
  quantity: number;
  product: { name: string; price: number; images: { url: string }[] };
};

export default function CheckoutClient({
  cartItems,
  subtotal,
  stores,
  addresses,
}: {
  cartItems: CartItem[];
  subtotal: number;
  stores: Store[];
  addresses: Address[];
}) {
  const router = useRouter();
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "SHIPPING">("PICKUP");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [showAddressForm, setShowAddressForm] = useState(addresses.length === 0);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const total = subtotal + (fulfillment === "SHIPPING" ? selectedShipping?.cost ?? 0 : 0);

  async function fetchShipping(city: string) {
    setLoadingShipping(true);
    const res = await fetch("/api/shipping-cost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ city, weightGrams: cartItems.length * 500 }),
    });
    const data = await res.json();
    setShippingOptions(data);
    setSelectedShipping(data[0] ?? null);
    setLoadingShipping(false);
  }

  async function saveAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const newAddress = await res.json();
    setAddressId(newAddress.id);
    setShowAddressForm(false);
    fetchShipping(newAddress.city);
    router.refresh();
  }

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fulfillment,
        storeId: fulfillment === "PICKUP" ? storeId : undefined,
        addressId: fulfillment === "SHIPPING" ? addressId : undefined,
        shippingCourier: selectedShipping ? `${selectedShipping.courier} ${selectedShipping.service}` : undefined,
        shippingCost: selectedShipping?.cost ?? 0,
      }),
    });
    const data = await res.json();
    setPlacing(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat pesanan.");
      return;
    }
    setQrisUrl(data.qrisUrl);
    setOrderId(data.orderId);
  }

  // Payment success screen (QRIS shown, poll would happen on order page)
  if (qrisUrl && orderId) {
    return (
      <div className="mx-auto max-w-md text-center rounded-3xl bg-white toy-shelf p-8">
        <p className="font-display text-2xl text-bimbi-pink-dark mb-2">Scan buat Bayar! 📱</p>
        <p className="text-sm text-bimbi-ink/60 mb-4">Total: <span className="font-bold">{formatIDR(total)}</span></p>
        <div className="relative mx-auto h-64 w-64 rounded-2xl overflow-hidden border-4 border-bimbi-sun">
          <Image src={qrisUrl} alt="QRIS code" fill className="object-contain bg-white" unoptimized />
        </div>
        <p className="text-xs text-bimbi-ink/50 mt-4">
          Buka GoPay, OVO, Dana, ShopeePay, atau m-Banking, lalu scan QR di atas.
        </p>
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="mt-6 w-full rounded-full bg-bimbi-mint px-6 py-3 font-bold text-white"
        >
          Sudah Bayar, Cek Status
        </button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Fulfillment choice */}
        <div className="rounded-2xl bg-white toy-shelf p-5">
          <p className="font-display text-lg mb-3">Cara Terima Barang</p>
          <div className="flex gap-3">
            <button
              onClick={() => setFulfillment("PICKUP")}
              className={`flex-1 rounded-2xl border-2 px-4 py-3 font-bold text-left transition-colors ${
                fulfillment === "PICKUP" ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
              }`}
            >
              🏪 Ambil di Toko
              <p className="text-xs font-normal text-bimbi-ink/50 mt-1">Gratis, ambil sendiri</p>
            </button>
            <button
              onClick={() => {
                setFulfillment("SHIPPING");
                if (selectedAddress) fetchShipping(selectedAddress.city);
              }}
              className={`flex-1 rounded-2xl border-2 px-4 py-3 font-bold text-left transition-colors ${
                fulfillment === "SHIPPING" ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
              }`}
            >
              🚚 Dikirim ke Rumah
              <p className="text-xs font-normal text-bimbi-ink/50 mt-1">Bayar ongkir sesuai kurir</p>
            </button>
          </div>
        </div>

        {fulfillment === "PICKUP" && (
          <div className="rounded-2xl bg-white toy-shelf p-5">
            <p className="font-display text-lg mb-3">Pilih Toko</p>
            <div className="space-y-2">
              {stores.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer ${
                    storeId === s.id ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="store"
                    checked={storeId === s.id}
                    onChange={() => setStoreId(s.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-sm text-bimbi-ink/60">{s.address}, {s.city}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {fulfillment === "SHIPPING" && (
          <div className="rounded-2xl bg-white toy-shelf p-5">
            <p className="font-display text-lg mb-3">Alamat Pengiriman</p>

            {!showAddressForm && addresses.length > 0 && (
              <div className="space-y-2 mb-3">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer ${
                      addressId === a.id ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === a.id}
                      onChange={() => {
                        setAddressId(a.id);
                        fetchShipping(a.city);
                      }}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-bold">{a.label} — {a.recipient}</p>
                      <p className="text-sm text-bimbi-ink/60">
                        {a.detail}, {a.district}, {a.city}, {a.province} {a.postalCode}
                      </p>
                      <p className="text-sm text-bimbi-ink/60">{a.phone}</p>
                    </div>
                  </label>
                ))}
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="text-sm font-bold text-bimbi-grape hover:underline"
                >
                  + Tambah alamat baru
                </button>
              </div>
            )}

            {showAddressForm && (
              <form onSubmit={saveAddress} className="grid sm:grid-cols-2 gap-3">
                <input name="label" placeholder="Label (Rumah/Kantor)" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2 sm:col-span-2" />
                <input name="recipient" placeholder="Nama penerima" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2" />
                <input name="phone" placeholder="No. HP" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2" />
                <input name="province" placeholder="Provinsi" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2" />
                <input name="city" placeholder="Kota/Kabupaten" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2" />
                <input name="district" placeholder="Kecamatan" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2" />
                <input name="postalCode" placeholder="Kode Pos" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2" />
                <textarea name="detail" placeholder="Nama jalan, no. rumah, patokan" required className="rounded-xl border-2 border-bimbi-ink/10 px-3 py-2 sm:col-span-2" />
                <button className="sm:col-span-2 rounded-full bg-bimbi-grape px-4 py-2 font-bold text-white">
                  Simpan Alamat
                </button>
              </form>
            )}

            {selectedAddress && !showAddressForm && (
              <div className="mt-4">
                <p className="font-display text-base mb-2">Pilih Kurir</p>
                {loadingShipping && <p className="text-sm text-bimbi-ink/50">Menghitung ongkir...</p>}
                <div className="space-y-2">
                  {shippingOptions.map((opt) => (
                    <label
                      key={`${opt.courier}-${opt.service}`}
                      className={`flex justify-between items-center rounded-xl border-2 p-3 cursor-pointer ${
                        selectedShipping?.courier === opt.courier && selectedShipping?.service === opt.service
                          ? "border-bimbi-pink bg-bimbi-pink/5"
                          : "border-bimbi-ink/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.courier === opt.courier && selectedShipping?.service === opt.service}
                          onChange={() => setSelectedShipping(opt)}
                        />
                        <div>
                          <p className="font-bold">{opt.courier} {opt.service}</p>
                          <p className="text-xs text-bimbi-ink/50">Estimasi {opt.etaDays}</p>
                        </div>
                      </div>
                      <span className="font-bold">{formatIDR(opt.cost)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      </div>

      {/* Order summary */}
      <div className="rounded-2xl bg-white toy-shelf p-6 h-fit">
        <p className="font-display text-xl mb-4">Ringkasan Pesanan</p>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {cartItems.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-bimbi-ink/70">{i.product.name} x{i.quantity}</span>
              <span className="font-semibold">{formatIDR(i.product.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-bimbi-ink/10 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          {fulfillment === "SHIPPING" && (
            <div className="flex justify-between text-sm">
              <span>Ongkir</span>
              <span>{formatIDR(selectedShipping?.cost ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between font-display text-lg text-bimbi-pink-dark pt-2">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>
        </div>
        <button
          onClick={placeOrder}
          disabled={placing || (fulfillment === "SHIPPING" && (!selectedAddress || !selectedShipping))}
          className="mt-5 w-full rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white shadow-[0_4px_0_var(--color-bimbi-pink-dark)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-transform disabled:opacity-50"
        >
          {placing ? "Membuat Pesanan..." : "Bayar dengan QRIS 📱"}
        </button>
      </div>
    </div>
  );
}
