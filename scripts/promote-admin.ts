// Promote an existing user to ADMIN so they can access /admin.
// Usage: npx tsx scripts/promote-admin.ts someone@example.com

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Pemakaian: npx tsx scripts/promote-admin.ts email@contoh.com");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Tidak ada user dengan email "${email}". Daftar dulu lewat /register, baru jalankan skrip ini.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`✅ ${updated.name} (${updated.email}) sekarang jadi ADMIN. Login lalu buka /admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
