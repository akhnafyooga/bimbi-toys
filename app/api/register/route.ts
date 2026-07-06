import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Semua kolom wajib diisi ya!" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email ini sudah terdaftar. Coba masuk aja." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
