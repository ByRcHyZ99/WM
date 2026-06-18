export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { setSession } from "@/lib/auth";
import { database } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Ungültige Anmeldung." }, { status: 400 });

  const user = await database.findUserByName(input.data.name);
  if (!user || !(await compare(input.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Name oder Passwort stimmt nicht." }, { status: 401 });
  }

  await setSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, isAdmin: user.isAdmin } });
}
