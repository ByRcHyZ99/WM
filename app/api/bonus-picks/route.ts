import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { database } from "@/lib/db";

const schema = z.object({
  questionId: z.string(),
  answer: z.string().trim().min(1).max(80)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Ungültige Bonusantwort." }, { status: 400 });

  const question = database.findQuestion(input.data.questionId);
  if (!question) return NextResponse.json({ error: "Bonusfrage nicht gefunden." }, { status: 404 });
  if (new Date(question.closesAt) <= new Date()) {
    return NextResponse.json({ error: "Diese Bonusfrage ist geschlossen." }, { status: 409 });
  }

  const pick = database.upsertBonusPick({ userId: user.id, questionId: question.id, answer: input.data.answer });

  return NextResponse.json({ pick });
}
