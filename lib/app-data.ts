import { database } from "@/lib/db";
import { buildScoreboard } from "@/lib/scoring";

export async function getAppData(userId?: string) {
  const users = database.users();
  const matches = database.matches();
  const bets = database.bets();
  const questions = database.questions();
  const bonusPicks = database.bonusPicks();

  return {
    matches,
    questions,
    scoreboard: buildScoreboard({ users, matches, bets, questions, bonusPicks }),
    myBets: userId ? bets.filter((bet) => bet.userId === userId) : [],
    myBonusPicks: userId ? bonusPicks.filter((pick) => pick.userId === userId) : []
  };
}
