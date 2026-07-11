import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🧸 Seeding Bimbi Toys...");

  // --- Categories ---
  const categories = await Promise.all(
    [
      { name: "Action Figure", slug: "action-figure", emoji: "🤖" },
      { name: "Boneka", slug: "boneka", emoji: "🧸" },
      { name: "Board Game", slug: "board-game", emoji: "🎲" },
      { name: "Diecast & RC", slug: "diecast-rc", emoji: "🚗" },
      { name: "Mainan Edukasi", slug: "mainan-edukasi", emoji: "🧩" },
      { name: "Outdoor & Sport", slug: "outdoor-sport", emoji: "🏀" },
    ].map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      })
    )
  );

  const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

  // --- Store locations ---
  const stores = await Promise.all([
    prisma.storeLocation.create({
      data: {
        name: "Bimbi Toys Kelapa Gading",
        city: "Jakarta Utara",
        address: "Jl. Boulevard Raya Blok QJ 1, Kelapa Gading",
        lat: -6.1595,
        lng: 106.9055,
        phone: "021-4500123",
      },
    }),
    prisma.storeLocation.create({
      data: {
        name: "Bimbi Toys Simpang Lima",
        city: "Semarang",
        address: "Jl. Pahlawan No. 12, Semarang",
        lat: -6.9899,
        lng: 110.4231,
        phone: "024-8500456",
      },
    }),
    prisma.storeLocation.create({
      data: {
        name: "Bimbi Toys Dago",
        city: "Bandung",
        address: "Jl. Ir. H. Djuanda No. 88, Bandung",
        lat: -6.8951,
        lng: 107.6134,
        phone: "022-2500789",
      },
    }),
  ]);

  // --- Products ---
  const products = [
    {
      name: "RoboKawan X1 Action Figure",
      slug: "robokawan-x1-action-figure",
      description:
        "Robot action figure setinggi 30cm dengan 20 titik gerak, lampu LED di dada, dan bisa berubah jadi mode kendaraan. Cocok buat koleksi maupun mainan tarung-tarungan seru sama teman.",
      price: 349000,
      compareAtPrice: 429000,
      stock: 40,
      minAge: 6,
      categorySlug: "action-figure",
      featured: true,
      images: ["https://picsum.photos/seed/robokawan1/600/600", "https://picsum.photos/seed/robokawan2/600/600"],
    },
    {
      name: "Boneka Beruang Cokelat 'Coklat'",
      slug: "boneka-beruang-coklat",
      description:
        "Boneka beruang super lembut bahan bulu premium anti alergi, ukuran 45cm. Teman tidur terbaik buat si kecil, aman dan sudah lulus uji keamanan mainan anak.",
      price: 189000,
      stock: 65,
      minAge: 0,
      categorySlug: "boneka",
      featured: true,
      images: ["https://picsum.photos/seed/bonekabear1/600/600"],
    },
    {
      name: "Ular Tangga & Ludo 2-in-1 Kayu",
      slug: "ular-tangga-ludo-kayu",
      description:
        "Board game klasik berbahan kayu solid dengan finishing halus, dilengkapi 2 papan permainan dalam satu kotak. Seru buat kumpul keluarga di rumah.",
      price: 95000,
      stock: 80,
      minAge: 4,
      categorySlug: "board-game",
      images: ["https://picsum.photos/seed/ulartangga1/600/600"],
    },
    {
      name: "Diecast Truk Molen Skala 1:32",
      slug: "diecast-truk-molen",
      description:
        "Miniatur truk molen (concrete mixer) skala 1:32 dengan drum berputar dan pintu bisa dibuka. Bahan die-cast metal, detail super realistis buat kolektor cilik.",
      price: 225000,
      stock: 30,
      minAge: 3,
      categorySlug: "diecast-rc",
      images: ["https://picsum.photos/seed/dieksttruk1/600/600"],
    },
    {
      name: "Mobil RC Offroad Monster 4WD",
      slug: "mobil-rc-offroad-monster",
      description:
        "Mobil remote control 4WD dengan ban chunky anti selip, kecepatan hingga 25km/jam, baterai isi ulang tahan 40 menit main nonstop. Siap gaspol di segala medan!",
      price: 459000,
      compareAtPrice: 599000,
      stock: 18,
      minAge: 8,
      categorySlug: "diecast-rc",
      featured: true,
      images: ["https://picsum.photos/seed/rcmonster1/600/600", "https://picsum.photos/seed/rcmonster2/600/600"],
    },
    {
      name: "Puzzle Kayu Angka & Huruf",
      slug: "puzzle-kayu-angka-huruf",
      description:
        "Puzzle edukasi kayu berisi angka 0-9 dan huruf A-Z dengan pegangan knop mudah digenggam anak. Melatih motorik halus dan pengenalan huruf sejak dini.",
      price: 65000,
      stock: 100,
      minAge: 2,
      categorySlug: "mainan-edukasi",
      images: ["https://picsum.photos/seed/puzzlekayu1/600/600"],
    },
    {
      name: "Set Sains Eksperimen Junior",
      slug: "set-sains-eksperimen-junior",
      description:
        "Kit eksperimen sains untuk anak berisi 30+ alat percobaan aman (kaca pembesar, tabung, pipet, dll) plus buku panduan 20 eksperimen seru rumahan.",
      price: 175000,
      stock: 45,
      minAge: 7,
      categorySlug: "mainan-edukasi",
      images: ["https://picsum.photos/seed/sainskit1/600/600"],
    },
    {
      name: "Bola Basket Anak Ukuran 5",
      slug: "bola-basket-anak-size-5",
      description:
        "Bola basket size 5 khusus untuk anak-anak, bahan rubber grip anti licin, cocok untuk latihan dasar dribble dan shooting di rumah atau lapangan sekolah.",
      price: 89000,
      stock: 70,
      minAge: 5,
      categorySlug: "outdoor-sport",
      images: ["https://picsum.photos/seed/bolabasket1/600/600"],
    },
    {
      name: "Skuter Lipat 3 Roda LED",
      slug: "skuter-lipat-3-roda-led",
      description:
        "Skuter anak 3 roda dengan roda menyala LED saat bergerak, tinggi setang bisa disesuaikan, dan rangka lipat praktis dibawa ke mana saja.",
      price: 275000,
      stock: 25,
      minAge: 3,
      categorySlug: "outdoor-sport",
      featured: true,
      images: ["https://picsum.photos/seed/skuterled1/600/600"],
    },
    {
      name: "Boneka Tangan Keluarga Hewan (isi 5)",
      slug: "boneka-tangan-keluarga-hewan",
      description:
        "Set 5 boneka tangan karakter hewan lucu (kucing, anjing, kelinci, beruang, monyet) untuk story telling dan bermain peran bersama si kecil.",
      price: 129000,
      stock: 50,
      minAge: 1,
      categorySlug: "boneka",
      images: ["https://picsum.photos/seed/bonekatangan1/600/600"],
    },
  ];

  for (const p of products) {
    const { categorySlug, images, ...data } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...data,
        categoryId: catId(categorySlug),
        images: {
          create: images.map((url, i) => ({ url, position: i })),
        },
      },
    });

    // spread stock across the 3 stores unevenly, for pickup logic demo
    await Promise.all(
      stores.map((s, i) =>
        prisma.storeStock.upsert({
          where: { storeId_productId: { storeId: s.id, productId: product.id } },
          update: {},
          create: {
            storeId: s.id,
            productId: product.id,
            quantity: Math.max(0, Math.floor(product.stock / 3) - i * 3),
          },
        })
      )
    );
  }

  // --- Demo user (password: bimbi123) ---
  await prisma.user.upsert({
    where: { email: "demo@bimbitoys.id" },
    update: {},
    create: {
      name: "Kak Bimbi",
      email: "demo@bimbitoys.id",
      passwordHash: await bcrypt.hash("bimbi123", 10),
    },
  });

  console.log("✅ Done! Demo login: demo@bimbitoys.id / bimbi123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
