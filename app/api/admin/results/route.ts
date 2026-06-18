import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { database } from "@/lib/db";
import type { MatchStatus } from "@/lib/types";

const schema = z.object({
  matchId: z.string(),
  status: z.enum(["SCHEDULED", "LIVE", "FINAL"]),
  homeScore: z.coerce.number().int().min(0).max(30).nullable().optional(),
  awayScore: z.coerce.number().int().min(0).max(30).nullable().optional()
});

export async function POST(request: Request) {
  await requireAdmin();
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Ergebnis prüfen." }, { status: 400 });

  const needsScore = input.data.status === "FINAL" || input.data.status === "LIVE";
  if (needsScore && (input.data.homeScore === null || input.data.homeScore === undefined || input.data.awayScore === null || input.data.awayScore === undefined)) {
    return NextResponse.json({ error: "Für Live/Final brauchst du beide Tore." }, { status: 400 });
  }

  const match = await database.setResult({
    matchId: input.data.matchId,
    status: input.data.status as MatchStatus,
    homeScore: input.data.status === "SCHEDULED" ? null : input.data.homeScore ?? null,
    awayScore: input.data.status === "SCHEDULED" ? null : input.data.awayScore ?? null
  });

  return NextResponse.json({ match });
}
