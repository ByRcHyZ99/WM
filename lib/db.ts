import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { Bet, BonusPick, BonusQuestion, Match, MatchStatus, PublicUser, User } from "@/lib/types";

function dbPath() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const raw = url.startsWith("file:") ? url.slice(5) : url;
  return isAbsolute(raw) ? raw : join(process.cwd(), raw);
}

const file = dbPath();
mkdirSync(dirname(file), { recursive: true });

const db = new Database(file, { timeout: 10000 });
db.pragma("busy_timeout = 10000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  isAdmin INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  number INTEGER UNIQUE,
  stage TEXT NOT NULL,
  groupName TEXT,
  homeTeam TEXT NOT NULL,
  awayTeam TEXT NOT NULL,
  kickoff TEXT NOT NULL,
  venue TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  homeScore INTEGER,
  awayScore INTEGER,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  matchId TEXT NOT NULL,
  homeScore INTEGER NOT NULL,
  awayScore INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, matchId),
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(matchId) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bonusQuestions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  closesAt TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 5,
  answer TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bonusPicks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  answer TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, questionId),
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(questionId) REFERENCES bonusQuestions(id) ON DELETE CASCADE
);
`);

function now() {
  return new Date().toISOString();
}

function boolUser(row: Omit<User, "isAdmin"> & { isAdmin: number }): User {
  return { ...row, isAdmin: Boolean(row.isAdmin) };
}

function publicUser(row: Omit<PublicUser, "isAdmin"> & { isAdmin: number }): PublicUser {
  return { ...row, isAdmin: Boolean(row.isAdmin) };
}

function matchRow(row: Omit<Match, "group"> & { groupName: string | null }): Match {
  const { groupName, ...rest } = row;
  return { ...rest, group: groupName };
}

export const database = {
  userCount() {
    return (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  },
  createUser(input: { name: string; passwordHash: string; isAdmin: boolean }) {
    const id = randomUUID();
    db.prepare("INSERT INTO users (id, name, passwordHash, isAdmin) VALUES (?, ?, ?, ?)").run(id, input.name, input.passwordHash, input.isAdmin ? 1 : 0);
    return this.findPublicUser(id);
  },
  findUserByName(name: string) {
    const row = db.prepare("SELECT * FROM users WHERE name = ?").get(name) as (Omit<User, "isAdmin"> & { isAdmin: number }) | undefined;
    return row ? boolUser(row) : null;
  },
  findPublicUser(id: string) {
    const row = db.prepare("SELECT id, name, isAdmin, createdAt FROM users WHERE id = ?").get(id) as (Omit<PublicUser, "isAdmin"> & { isAdmin: number }) | undefined;
    return row ? publicUser(row) : null;
  },
  users() {
    return (db.prepare("SELECT id, name, isAdmin, createdAt FROM users ORDER BY createdAt ASC").all() as (Omit<PublicUser, "isAdmin"> & { isAdmin: number })[]).map(publicUser);
  },
  matches() {
    return (db.prepare("SELECT *, groupName FROM matches ORDER BY kickoff ASC, number ASC").all() as (Omit<Match, "group"> & { groupName: string | null })[]).map(matchRow);
  },
  findMatch(id: string) {
    const row = db.prepare("SELECT *, groupName FROM matches WHERE id = ?").get(id) as (Omit<Match, "group"> & { groupName: string | null }) | undefined;
    return row ? matchRow(row) : null;
  },
  upsertMatch(input: Partial<Match> & Pick<Match, "stage" | "homeTeam" | "awayTeam" | "kickoff">) {
    const id = input.id ?? randomUUID();
    const existing = input.id ? this.findMatch(input.id) : null;
    if (existing) {
      db.prepare("UPDATE matches SET number = ?, stage = ?, groupName = ?, homeTeam = ?, awayTeam = ?, kickoff = ?, venue = ?, updatedAt = ? WHERE id = ?")
        .run(input.number ?? null, input.stage, input.group ?? null, input.homeTeam, input.awayTeam, input.kickoff, input.venue ?? null, now(), id);
    } else {
      db.prepare("INSERT INTO matches (id, number, stage, groupName, homeTeam, awayTeam, kickoff, venue, status, homeScore, awayScore) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, input.number ?? null, input.stage, input.group ?? null, input.homeTeam, input.awayTeam, input.kickoff, input.venue ?? null, input.status ?? "SCHEDULED", input.homeScore ?? null, input.awayScore ?? null);
    }
    return this.findMatch(id);
  },
  upsertMatchByNumber(input: Partial<Match> & Pick<Match, "number" | "stage" | "homeTeam" | "awayTeam" | "kickoff">) {
    const row = db.prepare("SELECT id FROM matches WHERE number = ?").get(input.number) as { id: string } | undefined;
    return this.upsertMatch({ ...input, id: row?.id });
  },
  setResult(input: { matchId: string; status: MatchStatus; homeScore: number | null; awayScore: number | null }) {
    db.prepare("UPDATE matches SET status = ?, homeScore = ?, awayScore = ?, updatedAt = ? WHERE id = ?").run(input.status, input.homeScore, input.awayScore, now(), input.matchId);
    return this.findMatch(input.matchId);
  },
  bets() {
    return db.prepare("SELECT * FROM bets").all() as Bet[];
  },
  upsertBet(input: { userId: string; matchId: string; homeScore: number; awayScore: number }) {
    db.prepare(`
      INSERT INTO bets (id, userId, matchId, homeScore, awayScore)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(userId, matchId) DO UPDATE SET homeScore = excluded.homeScore, awayScore = excluded.awayScore, updatedAt = ?
    `).run(randomUUID(), input.userId, input.matchId, input.homeScore, input.awayScore, now());
    return db.prepare("SELECT * FROM bets WHERE userId = ? AND matchId = ?").get(input.userId, input.matchId) as Bet;
  },
  questions() {
    return db.prepare("SELECT * FROM bonusQuestions ORDER BY closesAt ASC").all() as BonusQuestion[];
  },
  findQuestion(id: string) {
    return (db.prepare("SELECT * FROM bonusQuestions WHERE id = ?").get(id) as BonusQuestion | undefined) ?? null;
  },
  upsertQuestion(input: { id?: string; title: string; closesAt: string; points: number; answer: string | null }) {
    const id = input.id ?? randomUUID();
    const exists = !!this.findQuestion(id);
    if (exists) {
      db.prepare("UPDATE bonusQuestions SET title = ?, closesAt = ?, points = ?, answer = ? WHERE id = ?").run(input.title, input.closesAt, input.points, input.answer, id);
    } else {
      db.prepare("INSERT INTO bonusQuestions (id, title, closesAt, points, answer) VALUES (?, ?, ?, ?, ?)").run(id, input.title, input.closesAt, input.points, input.answer);
    }
    return this.findQuestion(id);
  },
  bonusPicks() {
    return db.prepare("SELECT * FROM bonusPicks").all() as BonusPick[];
  },
  upsertBonusPick(input: { userId: string; questionId: string; answer: string }) {
    db.prepare(`
      INSERT INTO bonusPicks (id, userId, questionId, answer)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(userId, questionId) DO UPDATE SET answer = excluded.answer, updatedAt = ?
    `).run(randomUUID(), input.userId, input.questionId, input.answer, now());
    return db.prepare("SELECT * FROM bonusPicks WHERE userId = ? AND questionId = ?").get(input.userId, input.questionId) as BonusPick;
  }
};
