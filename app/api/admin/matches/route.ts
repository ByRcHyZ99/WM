import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { database } from "@/lib/db";

const matchSchema = z.object({
  id: z.string().optional(),
  number: z.coerce.number().int().positive().optional().nullable(),
  stage: z.string().trim().min(2).max(40),
  group: z.string().trim().max(20).optional().nullable(),
  homeTeam: z.string().trim().min(2).max(60),
  awayTeam: z.string().trim().min(2).max(60),
  kickoff: z.string().datetime(),
  venue: z.string().trim().max(80).optional().nullable()
});

export async function POST(request: Request) {
  await requireAdmin();
  const input = matchSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Spieldaten prüfen." }, { status: 400 });

  const data = {
    number: input.data.number ?? null,
    stage: input.data.stage,
    group: input.data.group || null,
    homeTeam: input.data.homeTeam,
    awayTeam: input.data.awayTeam,
    kickoff: new Date(input.data.kickoff).toISOString(),
    venue: input.data.venue || null
  };

  const match = await database.upsertMatch({ id: input.data.id, ...data });

  return NextResponse.json({ match });
}
