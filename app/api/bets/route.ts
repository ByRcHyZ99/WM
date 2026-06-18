import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { database } from "@/lib/db";

const schema = z.object({
  matchId: z.string(),
  homeScore: z.coerce.number().int().min(0).max(30),
  awayScore: z.coerce.number().int().min(0).max(30)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Ungültiger Tipp." }, { status: 400 });

  const match = await database.findMatch(input.data.matchId);
  if (!match) return NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  if (match.status !== "SCHEDULED" || new Date(match.kickoff) <= new Date()) {
    return NextResponse.json({ error: "Für dieses Spiel ist die Tippabgabe geschlossen." }, { status: 409 });
  }

  const bet = await database.upsertBet({ userId: user.id, matchId: match.id, homeScore: input.data.homeScore, awayScore: input.data.awayScore });

  return NextResponse.json({ bet });
}
