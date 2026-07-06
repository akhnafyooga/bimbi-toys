# Panduan Input Data Toko (Store Location) — Bimbi Toys

Dokumen ini menjelaskan langkah-langkah untuk menambahkan data lokasi toko baru (**Store Location**) ke dalam aplikasi agar dapat langsung tampil dan terintegrasi dengan fitur **Ambil di Toko** (Store Pickup).

---

## 🏗️ Struktur Data Toko (Schema)

Setiap toko memiliki informasi sebagai berikut di dalam database:
- **`name`** (String): Nama toko (contoh: `"Bimbi Toys Simpang Lima"`).
- **`city`** (String): Kota lokasi toko (contoh: `"Semarang"`).
- **`address`** (String): Alamat lengkap toko.
- **`lat`** (Float / Desimal): Koordinat Latitude (lintang geografis) untuk peta/lokasi.
- **`lng`** (Float / Desimal): Koordinat Longitude (bujur geografis).
- **`phone`** (String, opsional): Nomor telepon toko.

---

## 🛠️ Cara 1: Menggunakan Prisma Studio (Metode Visual GUI)

Cara termudah dan tercepat untuk menginput data secara langsung adalah menggunakan **Prisma Studio**.

### Langkah-langkah:
1. Buka terminal pada folder proyek `bimbi-toys`.
2. Jalankan perintah Prisma Studio:
   ```bash
   npm run db:studio
   ```
   *(Jika terminal Anda memblokir script, jalankan `npm.cmd run db:studio` atau `npx.cmd prisma studio`)*
3. Halaman web baru akan otomatis terbuka di browser pada alamat **`http://localhost:5555`**.
4. Pilih model **`StoreLocation`** dari daftar tabel yang tersedia.
5. Klik tombol **`Add record`** di bagian atas menu.
6. Isi kolom data toko baru Anda (misalnya: nama, kota, alamat, koordinat lat & lng).
7. Klik tombol **`Save changes`** (tombol berwarna hijau di bagian atas) untuk menyimpannya ke database.

> [!IMPORTANT]
> **Menghubungkan Stok Mainan (Store Stock):**
> Agar toko baru tersebut terdaftar memiliki stok mainan di halaman detail produk, Anda juga harus membuat record stok di tabel **`StoreStock`** untuk produk terkait dengan mengaitkan `storeId` (ID toko baru) dan `productId` (ID produk) serta kuantitasnya (`quantity`).

---

## 💻 Cara 2: Melalui File Seed Database (Metode Kode Programmatic)

Jika Anda ingin mendistribusikan data toko awal secara permanen dalam codebase, Anda bisa menambahkannya ke script seeding.

### Langkah-langkah:
1. Buka file **`prisma/seed.ts`**.
2. Cari bagian **`// --- Store locations ---`** di bagian awal fungsi `main()`.
3. Tambahkan kode pembuatan toko baru di dalam array `Promise.all`. Contoh menambahkan toko baru di Surabaya:

```typescript
// prisma/seed.ts
const stores = await Promise.all([
  // Toko-toko lama...
  prisma.storeLocation.create({
    data: {
      name: "Bimbi Toys Tunjungan Plaza",
      city: "Surabaya",
      address: "Jl. Basuki Rahmat No. 8-12, Surabaya",
      lat: -7.2618,
      lng: 112.7383,
      phone: "031-5400999",
    },
  }),
]);
```

4. Jalankan script seeding ulang untuk mereset dan memuat data database baru Anda:
   ```bash
   npm run db:seed
   ```
   *(atau `npm.cmd run db:seed`)*

---

## 🗄️ Cara 3: Menggunakan SQLite Editor Direct (DB Browser)

Karena database lokal menggunakan SQLite:
1. Unduh dan install aplikasi **[DB Browser for SQLite](https://sqlitebrowser.org/)**.
2. Buka file database yang terletak di **`prisma/dev.db`**.
3. Buka tab **"Browse Data"** dan pilih tabel **`StoreLocation`**.
4. Klik **"New Record"**, isi datanya secara manual, lalu klik **"Write Changes"** untuk menyimpan perubahan.
