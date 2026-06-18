import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { Bet, BonusPick, BonusQuestion, Match, MatchStatus, PublicUser, User } from "@/lib/types";

const globalForPg = globalThis as unknown as { pgPool?: Pool; pgReady?: Promise<void> };
let _pool: Pool | undefined;

function getPool(): Pool {
  if (_pool) return _pool;
  if (globalForPg.pgPool) return (_pool = globalForPg.pgPool);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Use your Neon PostgreSQL connection string.");
  }

  _pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  if (process.env.NODE_ENV !== "production") globalForPg.pgPool = _pool;

  return _pool;
}

function now() {
  return new Date().toISOString();
}

function userRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    passwordHash: String(row.password_hash),
    isAdmin: Boolean(row.is_admin),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function publicUserRow(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    name: String(row.name),
    isAdmin: Boolean(row.is_admin),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function matchRow(row: Record<string, unknown>): Match {
  return {
    id: String(row.id),
    number: row.number === null ? null : Number(row.number),
    stage: String(row.stage),
    group: row.group_name === null ? null : String(row.group_name),
    homeTeam: String(row.home_team),
    awayTeam: String(row.away_team),
    kickoff: new Date(String(row.kickoff)).toISOString(),
    venue: row.venue === null ? null : String(row.venue),
    status: String(row.status) as MatchStatus,
    homeScore: row.home_score === null ? null : Number(row.home_score),
    awayScore: row.away_score === null ? null : Number(row.away_score),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function betRow(row: Record<string, unknown>): Bet {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    matchId: String(row.match_id),
    homeScore: Number(row.home_score),
    awayScore: Number(row.away_score),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function questionRow(row: Record<string, unknown>): BonusQuestion {
  return {
    id: String(row.id),
    title: String(row.title),
    closesAt: new Date(String(row.closes_at)).toISOString(),
    points: Number(row.points),
    answer: row.answer === null ? null : String(row.answer),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function pickRow(row: Record<string, unknown>): BonusPick {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    questionId: String(row.question_id),
    answer: String(row.answer),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

async function migrate() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      number INTEGER UNIQUE,
      stage TEXT NOT NULL,
      group_name TEXT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff TIMESTAMPTZ NOT NULL,
      venue TEXT,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      home_score INTEGER,
      away_score INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS bonus_questions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      closes_at TIMESTAMPTZ NOT NULL,
      points INTEGER NOT NULL DEFAULT 5,
      answer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bonus_picks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES bonus_questions(id) ON DELETE CASCADE,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, question_id)
    );
  `);
}

async function ready() {
  globalForPg.pgReady ??= migrate();
  await globalForPg.pgReady;
}

export const database = {
  async userCount() {
    await ready();
    const result = await getPool().query("SELECT COUNT(*)::int AS count FROM users");
    return Number(result.rows[0].count);
  },
  async createUser(input: { name: string; passwordHash: string; isAdmin: boolean }) {
    await ready();
    const id = randomUUID();
    const result = await getPool().query(
      "INSERT INTO users (id, name, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, name, is_admin, created_at",
      [id, input.name, input.passwordHash, input.isAdmin]
    );
    return publicUserRow(result.rows[0]);
  },
  async findUserByName(name: string) {
    await ready();
    const result = await getPool().query("SELECT * FROM users WHERE name = $1", [name]);
    return result.rows[0] ? userRow(result.rows[0]) : null;
  },
  async findPublicUser(id: string) {
    await ready();
    const result = await getPool().query("SELECT id, name, is_admin, created_at FROM users WHERE id = $1", [id]);
    return result.rows[0] ? publicUserRow(result.rows[0]) : null;
  },
  async users() {
    await ready();
    const result = await getPool().query("SELECT id, name, is_admin, created_at FROM users ORDER BY created_at ASC");
    return result.rows.map(publicUserRow);
  },
  async matches() {
    await ready();
    const result = await getPool().query("SELECT * FROM matches ORDER BY kickoff ASC, number ASC NULLS LAST");
    return result.rows.map(matchRow);
  },
  async findMatch(id: string) {
    await ready();
    const result = await getPool().query("SELECT * FROM matches WHERE id = $1", [id]);
    return result.rows[0] ? matchRow(result.rows[0]) : null;
  },
  async upsertMatch(input: Partial<Match> & Pick<Match, "stage" | "homeTeam" | "awayTeam" | "kickoff">) {
    await ready();
    const id = input.id ?? randomUUID();
    const result = await getPool().query(
      `
      INSERT INTO matches (id, number, stage, group_name, home_team, away_team, kickoff, venue, status, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        number = EXCLUDED.number,
        stage = EXCLUDED.stage,
        group_name = EXCLUDED.group_name,
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        kickoff = EXCLUDED.kickoff,
        venue = EXCLUDED.venue,
        updated_at = now()
      RETURNING *
      `,
      [
        id,
        input.number ?? null,
        input.stage,
        input.group ?? null,
        input.homeTeam,
        input.awayTeam,
        input.kickoff,
        input.venue ?? null,
        input.status ?? "SCHEDULED",
        input.homeScore ?? null,
        input.awayScore ?? null
      ]
    );
    return matchRow(result.rows[0]);
  },
  async upsertMatchByNumber(input: Partial<Match> & Pick<Match, "number" | "stage" | "homeTeam" | "awayTeam" | "kickoff">) {
    await ready();
    const result = await getPool().query("SELECT id FROM matches WHERE number = $1", [input.number]);
    return this.upsertMatch({ ...input, id: result.rows[0]?.id });
  },
  async setResult(input: { matchId: string; status: MatchStatus; homeScore: number | null; awayScore: number | null }) {
    await ready();
    const result = await getPool().query(
      "UPDATE matches SET status = $1, home_score = $2, away_score = $3, updated_at = $4 WHERE id = $5 RETURNING *",
      [input.status, input.homeScore, input.awayScore, now(), input.matchId]
    );
    return result.rows[0] ? matchRow(result.rows[0]) : null;
  },
  async bets() {
    await ready();
    const result = await getPool().query("SELECT * FROM bets");
    return result.rows.map(betRow);
  },
  async upsertBet(input: { userId: string; matchId: string; homeScore: number; awayScore: number }) {
    await ready();
    const result = await getPool().query(
      `
      INSERT INTO bets (id, user_id, match_id, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, match_id) DO UPDATE SET
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        updated_at = now()
      RETURNING *
      `,
      [randomUUID(), input.userId, input.matchId, input.homeScore, input.awayScore]
    );
    return betRow(result.rows[0]);
  },
  async questions() {
    await ready();
    const result = await getPool().query("SELECT * FROM bonus_questions ORDER BY closes_at ASC");
    return result.rows.map(questionRow);
  },
  async findQuestion(id: string) {
    await ready();
    const result = await getPool().query("SELECT * FROM bonus_questions WHERE id = $1", [id]);
    return result.rows[0] ? questionRow(result.rows[0]) : null;
  },
  async upsertQuestion(input: { id?: string; title: string; closesAt: string; points: number; answer: string | null }) {
    await ready();
    const id = input.id ?? randomUUID();
    const result = await getPool().query(
      `
      INSERT INTO bonus_questions (id, title, closes_at, points, answer)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        closes_at = EXCLUDED.closes_at,
        points = EXCLUDED.points,
        answer = EXCLUDED.answer
      RETURNING *
      `,
      [id, input.title, input.closesAt, input.points, input.answer]
    );
    return questionRow(result.rows[0]);
  },
  async bonusPicks() {
    await ready();
    const result = await getPool().query("SELECT * FROM bonus_picks");
    return result.rows.map(pickRow);
  },
  async upsertBonusPick(input: { userId: string; questionId: string; answer: string }) {
    await ready();
    const result = await getPool().query(
      `
      INSERT INTO bonus_picks (id, user_id, question_id, answer)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, question_id) DO UPDATE SET
        answer = EXCLUDED.answer,
        updated_at = now()
      RETURNING *
      `,
      [randomUUID(), input.userId, input.questionId, input.answer]
    );
    return pickRow(result.rows[0]);
  }
};
