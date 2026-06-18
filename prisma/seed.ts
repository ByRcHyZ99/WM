import { database } from "../lib/db";

const matches = [
  {
    number: 1,
    stage: "Gruppenphase",
    group: "A",
    homeTeam: "Mexiko",
    awayTeam: "Südafrika",
    kickoff: "2026-06-11T21:00:00.000Z",
    venue: "Mexico City",
    status: "FINAL" as const,
    homeScore: 2,
    awayScore: 0
  },
  {
    number: 2,
    stage: "Gruppenphase",
    group: "A",
    homeTeam: "Südkorea",
    awayTeam: "Tschechien",
    kickoff: "2026-06-12T00:00:00.000Z",
    venue: "Zapopan",
    status: "FINAL" as const,
    homeScore: 2,
    awayScore: 1
  },
  {
    number: 3,
    stage: "Gruppenphase",
    group: "B",
    homeTeam: "Kanada",
    awayTeam: "Bosnien und Herzegowina",
    kickoff: "2026-06-12T19:00:00.000Z",
    venue: "Toronto",
    status: "FINAL" as const,
    homeScore: 1,
    awayScore: 1
  },
  {
    number: 4,
    stage: "Gruppenphase",
    group: "D",
    homeTeam: "USA",
    awayTeam: "Paraguay",
    kickoff: "2026-06-13T01:00:00.000Z",
    venue: "Inglewood",
    status: "FINAL" as const,
    homeScore: 4,
    awayScore: 1
  },
  {
    number: 31,
    stage: "Gruppenphase",
    group: "A",
    homeTeam: "Tschechien",
    awayTeam: "Südafrika",
    kickoff: "2026-06-18T16:00:00.000Z",
    venue: "Atlanta"
  },
  {
    number: 32,
    stage: "Gruppenphase",
    group: "B",
    homeTeam: "Schweiz",
    awayTeam: "Bosnien und Herzegowina",
    kickoff: "2026-06-18T19:00:00.000Z",
    venue: "Inglewood"
  },
  {
    number: 33,
    stage: "Gruppenphase",
    group: "B",
    homeTeam: "Kanada",
    awayTeam: "Katar",
    kickoff: "2026-06-18T22:00:00.000Z",
    venue: "Vancouver"
  },
  {
    number: 34,
    stage: "Gruppenphase",
    group: "A",
    homeTeam: "Mexiko",
    awayTeam: "Südkorea",
    kickoff: "2026-06-19T03:00:00.000Z",
    venue: "Zapopan"
  },
  {
    number: 52,
    stage: "Gruppenphase",
    group: "B",
    homeTeam: "Bosnien und Herzegowina",
    awayTeam: "Katar",
    kickoff: "2026-06-24T19:00:00.000Z",
    venue: "Seattle"
  },
  {
    number: 53,
    stage: "Gruppenphase",
    group: "B",
    homeTeam: "Schweiz",
    awayTeam: "Kanada",
    kickoff: "2026-06-24T19:00:00.000Z",
    venue: "Vancouver"
  }
];

function main() {
  for (const match of matches) {
    database.upsertMatchByNumber(match);
  }

  database.upsertQuestion({
    id: "top-scorer",
    title: "Wer wird Top-Torschütze?",
    closesAt: "2026-06-24T16:00:00.000Z",
    points: 8,
    answer: null
  });

  database.upsertQuestion({
    id: "world-champion",
    title: "Wer wird Weltmeister?",
    closesAt: "2026-06-28T16:00:00.000Z",
    points: 10,
    answer: null
  });
}

main();
