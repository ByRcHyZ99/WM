export type MatchStatus = "SCHEDULED" | "LIVE" | "FINAL";

export type User = {
  id: string;
  name: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
};

export type PublicUser = Pick<User, "id" | "name" | "isAdmin" | "createdAt">;

export type Match = {
  id: string;
  number: number | null;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  venue: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Bet = {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
};

export type BonusQuestion = {
  id: string;
  title: string;
  closesAt: string;
  points: number;
  answer: string | null;
  createdAt: string;
};

export type BonusPick = {
  id: string;
  userId: string;
  questionId: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
};
