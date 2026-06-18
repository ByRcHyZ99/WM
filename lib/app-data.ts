import { database } from "@/lib/db";
import { buildScoreboard } from "@/lib/scoring";

export async function getAppData(userId?: string) {
  const [users, matches, bets, questions, bonusPicks] = await Promise.all([
    database.users(),
    database.matches(),
    database.bets(),
    database.questions(),
    database.bonusPicks()
  ]);

  return {
    matches,
    questions,
    scoreboard: buildScoreboard({ users, matches, bets, questions, bonusPicks }),
    myBets: userId ? bets.filter((bet) => bet.userId === userId) : [],
    myBonusPicks: userId ? bonusPicks.filter((pick) => pick.userId === userId) : []
  };
}
