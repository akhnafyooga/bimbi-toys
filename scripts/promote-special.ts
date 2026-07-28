// Give a customer the "harga spesial kenalan" discount (percent off every item).
//
// Usage:
//   npm run user:special email@contoh.com        -> 10% (default)
//   npm run user:special email@contoh.com 15     -> custom percentage
//   npm run user:special email@contoh.com 0      -> remove the discount

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const raw = process.argv[3];

  if (!email) {
    console.error("Pemakaian: npm run user:special email@contoh.com [persen]");
    process.exit(1);
  }

  const percent = raw === undefined ? 10 : Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent > 90) {
    console.error("Persen harus angka 0–90. Contoh: npm run user:special email@contoh.com 10");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `Tidak ada user dengan email "${email}". Minta mereka daftar dulu lewat /register, baru jalankan skrip ini.`
    );
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { discountPercent: Math.round(percent) },
  });

  if (updated.discountPercent > 0) {
    console.log(
      `✅ ${updated.name} (${updated.email}) sekarang dapat harga spesial ${updated.discountPercent}% untuk semua barang.`
    );
  } else {
    console.log(`✅ Harga spesial untuk ${updated.name} (${updated.email}) sudah dihapus.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
