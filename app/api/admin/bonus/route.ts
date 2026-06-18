import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { database } from "@/lib/db";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(100),
  closesAt: z.string().datetime(),
  points: z.coerce.number().int().min(1).max(50),
  answer: z.string().trim().max(80).optional().nullable()
});

export async function POST(request: Request) {
  await requireAdmin();
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Bonusfrage prüfen." }, { status: 400 });

  const data = {
    title: input.data.title,
    closesAt: new Date(input.data.closesAt).toISOString(),
    points: input.data.points,
    answer: input.data.answer || null
  };

  const question = database.upsertQuestion({ id: input.data.id, ...data });

  return NextResponse.json({ question });
}
