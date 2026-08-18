# Panduan Panel Admin Bimbi Toys

Panduan ini untuk kamu yang akan mengelola toko online Bimbi Toys sehari-hari —
menambah produk, memproses pesanan, dan mengatur stok. Tidak perlu bisa
coding sama sekali, cukup ikuti langkah-langkahnya satu per satu.

---

## 1. Cara Masuk (Login)

1. Buka alamat website toko di browser (Chrome, atau browser apa saja di HP/tablet/komputer).
2. Klik **Masuk / Daftar** di pojok kanan atas.
3. Isi **Email** dan **Password** akun kamu, lalu klik **Masuk**.
4. Setelah masuk, tambahkan `/admin` di akhir alamat website (contoh: `namatokokamu.com/admin`), atau minta bookmark/tautan langsung dari developer.
5. Kalau berhasil, kamu akan melihat halaman **Dashboard** dengan menu di bagian atas: Dashboard, Produk, Kategori, Pesanan, Stok Toko, Pelanggan.

> Kalau setelah masuk kamu malah diarahkan kembali ke halaman toko biasa, berarti akunmu belum dijadikan admin. Minta developer menjalankan perintah promosi akun (lihat bagian 5 di bawah).

---

## 2. Menambah Produk Baru (dengan Foto)

1. Di menu atas, klik **Produk**.
2. Klik tombol hijau **+ Tambah Produk Baru**.
3. Isi kolom-kolom berikut:
   - **Nama Produk** — contoh: "Boneka Beruang Coklat".
   - **Deskripsi** — ceritakan produknya: bahan, ukuran, keunggulan.
   - **Foto Produk** — klik kotak putus-putus (atau seret foto ke sana) untuk memilih foto dari HP/komputer. Bisa upload lebih dari satu foto. Foto pertama otomatis jadi foto utama yang tampil di toko. Kamu bisa hapus foto atau ubah urutannya dengan tombol yang muncul saat foto disentuh/di-hover.
   - **Harga** — masukkan angka saja, tanpa titik dan tanpa "Rp". Contoh: ketik `150000` untuk Rp150.000.
   - **Harga Coret** *(opsional)* — isi ini hanya kalau produk sedang diskon. Ini harga lama yang akan dicoret di toko.
   - **Stok** — jumlah barang yang tersedia.
   - **Usia Minimal** *(opsional)* — rekomendasi usia dalam tahun, kalau ada.
   - **Kategori** — pilih kategori yang paling cocok.
   - **⭐ Tampilkan sebagai produk unggulan** — centang kalau produk ini mau ditonjolkan di halaman depan toko.
4. Klik **Simpan**.
5. Kalau berhasil, akan muncul tulisan **"✅ Produk berhasil disimpan"** dan kamu akan dibawa kembali ke daftar produk.
6. Kalau ada kolom yang belum benar (misalnya harga kosong), akan muncul tulisan merah kecil di bawah kolom itu yang menjelaskan apa yang salah — perbaiki lalu klik **Simpan** lagi.

---

## 3. Mengubah Harga atau Stok Produk

1. Di menu **Produk**, cari produk yang mau diubah — bisa ketik nama produknya di kotak **Cari nama produk...**, atau pilih kategori di dropdown lalu klik **Cari**.
2. Klik **Edit** di baris produk tersebut.
3. Ubah kolom **Harga** dan/atau **Stok** sesuai kebutuhan.
4. Klik **Simpan**.

Kalau ingin menghapus produk, klik **Hapus** di baris produk itu, lalu konfirmasi pertanyaan yang muncul. Kalau produk itu sudah pernah dipesan pelanggan, sistem tidak akan mengizinkan hapus (supaya riwayat pesanan lama tidak rusak) — kosongkan saja stoknya jadi `0` sebagai gantinya.

---

## 4. Memproses Pesanan (dari Dibayar sampai Selesai)

1. Di menu atas, klik **Dashboard** — bagian **🔔 Perlu Ditindaklanjuti** menunjukkan pesanan mana saja yang butuh kamu proses sekarang. Atau klik menu **Pesanan** untuk melihat semua pesanan.
2. Klik nomor pesanan (contoh: `BIMBI-20260706-0001`) untuk membuka detailnya.
3. Di halaman detail, kamu akan melihat kotak **🔔 Perlu ditindaklanjuti** dengan tombol besar berwarna merah muda. Tombolnya berubah tergantung tahap pesanan:
   - Kalau status **Sudah Dibayar** → tombolnya **"Tandai Sudah Dikemas"**. Klik setelah barang selesai dikemas.
   - Kalau status **Sedang Dikemas** dan pesanan dikirim → tombolnya **"Tandai Sudah Dikirim"**. Kalau pesanan diambil di toko → tombolnya **"Tandai Siap Diambil"**.
   - Kalau status **Sedang Dikirim** atau **Siap Diambil di Toko** → tombolnya **"Tandai Selesai"**. Klik setelah barang sudah sampai/diambil pelanggan.
4. Setiap klik akan muncul konfirmasi singkat — klik OK/Yes untuk lanjut.
5. Setelah berhasil, statusnya langsung berubah dan tombol berikutnya akan muncul untuk tahap selanjutnya.

**Penting:** Status **pembayaran** (Menunggu Pembayaran → Sudah Dibayar) berubah **otomatis** begitu pelanggan berhasil scan QRIS — kamu tidak perlu dan tidak bisa mengubah status pembayaran secara manual dari panel ini. Kamu hanya mengatur tahap pengemasan/pengiriman.

---

## 5. Mengelola Kategori dan Stok per Toko

- **Kategori**: menu **Kategori** → **+ Tambah Kategori Baru** untuk kategori baru (misalnya "Mainan Outdoor"), atau **Edit**/**Hapus** pada kategori yang ada. Kategori yang masih dipakai produk tidak bisa dihapus — pindahkan dulu produknya ke kategori lain.
- **Stok per toko fisik**: menu **Stok Toko** menampilkan semua toko cabang. Klik **📦 Kelola Stok** pada toko yang mau diatur, lalu isi jumlah stok tiap produk di toko itu, dan klik **Simpan Semua** di bagian bawah.
- **Menambah toko baru**: klik **+ Tambah Toko Baru**, isi nama, kota, alamat, nomor telepon, dan koordinat lokasi (lihat petunjuk kecil di bawah kolom Latitude/Longitude — cukup buka Google Maps, klik kanan lokasi tokonya, lalu salin angka yang muncul).

---

## 5b. Mengelola Rak Toko ("Lihat Ada Apa di Toko")

Halaman **/store** di website membiarkan pelanggan menjelajahi rak fisik toko — seperti berjalan di lorong toko, tapi dari rumah. Kamu yang mengatur isinya lewat menu **Rak Toko**:

- **Kategori rak** (misalnya "Mainan Bayi", "Edukasi"): klik **Kelola Kategori Rak** untuk menambah, mengubah nama/urutan, atau menghapus. Kategori yang masih dipakai rak tidak bisa dihapus.
- **Tambah rak baru**: klik **+ Tambah Rak Baru**, isi nama (misal "Mainan Edukasi"), kode yang tertera di rak fisik (misal `EDU-04`), pilih toko, kategori rak, dan bila ada — foto raknya. Rak tanpa foto tetap tampil dengan papan kode rak.
- **Mengisi produk ke rak**: buka rak (menu **Rak Toko** → **Edit**), cari nama produk di kotak pencarian, klik **+ Tambah**, atur urutannya dengan tombol ▲▼, lalu klik **Simpan Produk Rak**. Produk yang sama boleh ditempatkan di banyak rak/toko.
- Rentang harga dan jumlah produk di setiap rak dihitung **otomatis** dari produk yang kamu taruh di raknya — tidak perlu diisi manual.
- Hapus centang **Tampilkan di halaman pelanggan** kalau mau menyembunyikan rak sementara tanpa menghapus datanya. Menghapus rak **tidak** menghapus produknya; produk hanya lepas dari rak itu.

---

## 6. Melihat Data Pelanggan

Menu **Pelanggan** menampilkan daftar orang yang sudah mendaftar di toko — nama, email, jumlah pesanan, dan sejak kapan bergabung. Halaman ini hanya untuk dilihat (tidak bisa diubah dari sini), untuk menjaga privasi data pelanggan.

---

## 7. Menjadikan Rekan Kerja sebagai Admin

Panel admin belum punya tombol "jadikan admin" di dalam website (ini demi keamanan, supaya tidak sembarang orang bisa menaikkan dirinya sendiri jadi admin). Untuk menambah admin baru:

1. Minta rekan kerjamu mendaftar akun biasa dulu lewat halaman **Daftar** di toko.
2. Minta developer/pengelola teknis menjalankan perintah berikut sekali saja (dari komputer yang menyimpan kode website):
   ```
   npm run admin:promote -- email-rekan-kerja@contoh.com
   ```
3. Setelah itu, rekan kerjamu bisa login seperti biasa dan langsung mengakses `/admin`.

---

## Tips Umum

- Bisa dipakai dari HP atau tablet — tidak wajib pakai komputer/laptop.
- Setiap kali menyimpan sesuatu, tunggu sampai muncul tulisan **"✅ ... berhasil disimpan"** sebelum menutup halaman.
- Setiap kali menghapus sesuatu, akan selalu ada pertanyaan konfirmasi dulu — baca baik-baik sebelum klik OK, karena data yang dihapus tidak bisa dikembalikan.
- Kalau ragu atau menemukan sesuatu yang aneh, tidak apa-apa untuk berhenti dan bertanya ke developer sebelum melanjutkan.
