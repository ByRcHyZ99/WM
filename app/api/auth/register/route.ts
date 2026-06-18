import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { setSession } from "@/lib/auth";
import { database } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(32),
  password: z.string().min(6).max(100),
  adminCode: z.string().optional()
});

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Bitte Name und Passwort prüfen." }, { status: 400 });

  const userCount = await database.userCount();
  const isAdmin = userCount === 0 || (!!process.env.ADMIN_CODE && input.data.adminCode === process.env.ADMIN_CODE);

  try {
    const user = await database.createUser({ name: input.data.name, passwordHash: await hash(input.data.password, 12), isAdmin });
    if (!user) throw new Error("User not created");

    await setSession(user.id);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Dieser Name ist schon vergeben." }, { status: 409 });
  }
}
