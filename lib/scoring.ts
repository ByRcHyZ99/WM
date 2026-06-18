import type { Bet, BonusPick, BonusQuestion, Match, PublicUser } from "@/lib/types";

export const POINTS = {
  exact: 4,
  difference: 3,
  tendency: 2
} as const;

export function matchPoints(
  bet: Pick<Bet, "homeScore" | "awayScore">,
  match: Pick<Match, "status" | "homeScore" | "awayScore">
) {
  if (match.status !== "FINAL" || match.homeScore === null || match.awayScore === null) return 0;
  if (bet.homeScore === match.homeScore && bet.awayScore === match.awayScore) return POINTS.exact;

  const betDiff = bet.homeScore - bet.awayScore;
  const realDiff = match.homeScore - match.awayScore;
  if (betDiff === realDiff) return POINTS.difference;

  if (Math.sign(betDiff) === Math.sign(realDiff)) return POINTS.tendency;
  return 0;
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}

export function bonusPoints(
  pick: Pick<BonusPick, "answer">,
  question: Pick<BonusQuestion, "answer" | "points">
) {
  if (!question.answer) return 0;
  return normalizeAnswer(pick.answer) === normalizeAnswer(question.answer) ? question.points : 0;
}

export type ScoreboardRow = {
  userId: string;
  name: string;
  isAdmin: boolean;
  total: number;
  exact: number;
  tendency: number;
  matchPoints: number;
  bonusPoints: number;
  submittedBets: number;
};

export function buildScoreboard(args: {
  users: Pick<PublicUser, "id" | "name" | "isAdmin">[];
  matches: Match[];
  bets: Bet[];
  questions: BonusQuestion[];
  bonusPicks: BonusPick[];
}): ScoreboardRow[] {
  return args.users
    .map((user) => {
      const userBets = args.bets.filter((bet) => bet.userId === user.id);
      let matchTotal = 0;
      let exact = 0;
      let tendency = 0;

      for (const bet of userBets) {
        const match = args.matches.find((item) => item.id === bet.matchId);
        if (!match) continue;
        const points = matchPoints(bet, match);
        matchTotal += points;
        if (points === POINTS.exact) exact += 1;
        if (points > 0) tendency += 1;
      }

      const userBonus = args.bonusPicks
        .filter((pick) => pick.userId === user.id)
        .reduce((sum, pick) => {
          const question = args.questions.find((item) => item.id === pick.questionId);
          return question ? sum + bonusPoints(pick, question) : sum;
        }, 0);

      return {
        userId: user.id,
        name: user.name,
        isAdmin: user.isAdmin,
        total: matchTotal + userBonus,
        exact,
        tendency,
        matchPoints: matchTotal,
        bonusPoints: userBonus,
        submittedBets: userBets.length
      };
    })
    .sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name, "de"));
}
