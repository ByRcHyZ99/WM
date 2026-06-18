"use client";

import { CalendarClock, Check, LogOut, Plus, Save, Shield, Trophy, UserRound } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";

type User = { id: string; name: string; isAdmin: boolean; createdAt?: string | Date };
type Match = {
  id: string;
  number: number | null;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoff: string | Date;
  venue: string | null;
  status: "SCHEDULED" | "LIVE" | "FINAL";
  homeScore: number | null;
  awayScore: number | null;
};
type Bet = { id: string; userId: string; matchId: string; homeScore: number; awayScore: number };
type BonusQuestion = { id: string; title: string; closesAt: string | Date; points: number; answer: string | null };
type BonusPick = { id: string; userId: string; questionId: string; answer: string };
type ScoreboardRow = {
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
type AppData = {
  matches: Match[];
  questions: BonusQuestion[];
  scoreboard: ScoreboardRow[];
  myBets: Bet[];
  myBonusPicks: BonusPick[];
};

const emptyMatch = {
  stage: "Gruppenphase",
  group: "",
  homeTeam: "",
  awayTeam: "",
  kickoff: "",
  venue: "",
  number: ""
};

export function TipspielApp({ initialUser, initialData }: { initialUser: User | null; initialData: AppData }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [data, setData] = useState<AppData>(initialData);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const response = await fetch("/api/app-data", { cache: "no-store" });
    const payload = await response.json();
    setUser(payload.user);
    setData({
      matches: payload.matches,
      questions: payload.questions,
      scoreboard: payload.scoreboard,
      myBets: payload.myBets,
      myBonusPicks: payload.myBonusPicks
    });
  }

  async function postJson(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Das hat nicht geklappt.");
    return payload;
  }

  function run(action: () => Promise<void>, success?: string) {
    setMessage("");
    startTransition(async () => {
      try {
        await action();
        await refresh();
        if (success) setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unbekannter Fehler.");
      }
    });
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Privates Tippspiel</p>
          <h1>WM Tippspiel</h1>
        </div>
        <div className="account-pill">
          {user ? (
            <>
              <UserRound size={18} />
              <span>{user.name}</span>
              {user.isAdmin && <Shield size={17} />}
              <button className="icon-button" title="Abmelden" onClick={() => run(() => postJson("/api/auth/logout"), "Abgemeldet.")}>
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <span>Bitte anmelden</span>
          )}
        </div>
      </section>

      {message && <div className="notice">{message}</div>}

      {!user ? (
        <AuthPanel mode={authMode} setMode={setAuthMode} isPending={isPending} onSubmit={(url, body) => run(() => postJson(url, body), "Willkommen im Tippspiel.")} />
      ) : (
        <div className="grid">
          <Scoreboard rows={data.scoreboard} currentUserId={user.id} />
          <BonusPanel questions={data.questions} picks={data.myBonusPicks} isPending={isPending} run={run} />
          <MatchesPanel matches={data.matches} bets={data.myBets} isAdmin={user.isAdmin} isPending={isPending} run={run} />
          {user.isAdmin && <AdminPanel matches={data.matches} questions={data.questions} run={run} isPending={isPending} />}
        </div>
      )}
    </main>
  );
}

function AuthPanel({
  mode,
  setMode,
  isPending,
  onSubmit
}: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  isPending: boolean;
  onSubmit: (url: string, body: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");

  return (
    <section className="panel auth-panel">
      <div className="segmented">
        <button className={clsx(mode === "login" && "active")} onClick={() => setMode("login")}>Login</button>
        <button className={clsx(mode === "register" && "active")} onClick={() => setMode("register")}>Registrieren</button>
      </div>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(mode === "login" ? "/api/auth/login" : "/api/auth/register", { name, password, adminCode });
        }}
      >
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" /></label>
        <label>Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {mode === "register" && <label>Admin-Code optional<input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} /></label>}
        <button className="primary" disabled={isPending}><Check size={18} />{mode === "login" ? "Einloggen" : "Account erstellen"}</button>
      </form>
      <p className="hint">Der erste registrierte Account wird automatisch Admin.</p>
    </section>
  );
}

function Scoreboard({ rows, currentUserId }: { rows: ScoreboardRow[]; currentUserId: string }) {
  return (
    <section className="panel scoreboard">
      <h2><Trophy size={21} /> Scoreboard</h2>
      <div className="score-list">
        {rows.map((row, index) => (
          <div className={clsx("score-row", row.userId === currentUserId && "me")} key={row.userId}>
            <span className="rank">{index + 1}</span>
            <span className="player">{row.name}</span>
            <span className="points">{row.total}</span>
            <small>{row.exact} exakt · {row.submittedBets} Tipps · {row.bonusPoints} Bonus</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function BonusPanel({ questions, picks, isPending, run }: { questions: BonusQuestion[]; picks: BonusPick[]; isPending: boolean; run: (action: () => Promise<void>, success?: string) => void }) {
  return (
    <section className="panel">
      <h2><Trophy size={21} /> Bonus</h2>
      {questions.length === 0 && <p className="hint">Noch keine Bonusfragen angelegt.</p>}
      {questions.map((question) => {
        const pick = picks.find((item) => item.questionId === question.id);
        const closed = new Date(question.closesAt) <= new Date();
        return <BonusForm key={question.id} question={question} pick={pick} closed={closed} isPending={isPending} run={run} />;
      })}
    </section>
  );
}

function BonusForm({ question, pick, closed, isPending, run }: { question: BonusQuestion; pick?: BonusPick; closed: boolean; isPending: boolean; run: (action: () => Promise<void>, success?: string) => void }) {
  const [answer, setAnswer] = useState(pick?.answer ?? "");
  return (
    <form
      className="bonus-form"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => apiPost("/api/bonus-picks", { questionId: question.id, answer }), "Bonus-Tipp gespeichert.");
      }}
    >
      <div>
        <strong>{question.title}</strong>
        <small>{question.points} Punkte · Schluss {formatDate(question.closesAt)}</small>
      </div>
      <input value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={closed} />
      <button className="icon-button" title="Bonus-Tipp speichern" disabled={closed || isPending}><Save size={17} /></button>
    </form>
  );
}

function MatchesPanel({ matches, bets, isAdmin, isPending, run }: { matches: Match[]; bets: Bet[]; isAdmin: boolean; isPending: boolean; run: (action: () => Promise<void>, success?: string) => void }) {
  const grouped = useMemo(() => groupMatches(matches), [matches]);

  return (
    <section className="panel matches">
      <h2><CalendarClock size={21} /> Spiele tippen</h2>
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="match-group">
          <h3>{label}</h3>
          {items.map((match) => {
            const bet = bets.find((item) => item.matchId === match.id);
            return <MatchCard key={match.id} match={match} bet={bet} isAdmin={isAdmin} isPending={isPending} run={run} />;
          })}
        </div>
      ))}
    </section>
  );
}

function MatchCard({ match, bet, isAdmin, isPending, run }: { match: Match; bet?: Bet; isAdmin: boolean; isPending: boolean; run: (action: () => Promise<void>, success?: string) => void }) {
  const [homeScore, setHomeScore] = useState(String(bet?.homeScore ?? ""));
  const [awayScore, setAwayScore] = useState(String(bet?.awayScore ?? ""));
  const closed = match.status !== "SCHEDULED" || new Date(match.kickoff) <= new Date();

  return (
    <article className="match-card">
      <div className="match-meta">
        <span>{match.number ? `#${match.number}` : match.stage}</span>
        <span>{formatDate(match.kickoff)}</span>
        {match.venue && <span>{match.venue}</span>}
      </div>
      <div className="teams">
        <strong>{match.homeTeam}</strong>
        <span>{match.status === "SCHEDULED" ? "vs" : `${match.homeScore ?? 0}:${match.awayScore ?? 0}`}</span>
        <strong>{match.awayTeam}</strong>
      </div>
      <form
        className="bet-form"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => apiPost("/api/bets", { matchId: match.id, homeScore, awayScore }), "Tipp gespeichert.");
        }}
      >
        <input aria-label={`${match.homeTeam} Tore`} inputMode="numeric" value={homeScore} onChange={(event) => setHomeScore(event.target.value)} disabled={closed} />
        <span>:</span>
        <input aria-label={`${match.awayTeam} Tore`} inputMode="numeric" value={awayScore} onChange={(event) => setAwayScore(event.target.value)} disabled={closed} />
        <button className="icon-button" title="Tipp speichern" disabled={closed || isPending}><Save size={17} /></button>
      </form>
      {closed && <small className="locked">{isAdmin ? "Tipp geschlossen" : "Geschlossen"}</small>}
    </article>
  );
}

function AdminPanel({ matches, questions, run, isPending }: { matches: Match[]; questions: BonusQuestion[]; run: (action: () => Promise<void>, success?: string) => void; isPending: boolean }) {
  const [newMatch, setNewMatch] = useState(emptyMatch);
  const [question, setQuestion] = useState({ title: "Top-Torschütze", closesAt: "", points: "8", answer: "" });

  return (
    <section className="panel admin">
      <h2><Shield size={21} /> Admin</h2>
      <form
        className="admin-grid"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => apiPost("/api/admin/matches", { ...newMatch, number: newMatch.number ? Number(newMatch.number) : null, kickoff: new Date(newMatch.kickoff).toISOString() }),
            "Spiel angelegt."
          );
        }}
      >
        <input placeholder="Nr." value={newMatch.number} onChange={(event) => setNewMatch({ ...newMatch, number: event.target.value })} />
        <input placeholder="Gruppe" value={newMatch.group} onChange={(event) => setNewMatch({ ...newMatch, group: event.target.value })} />
        <input placeholder="Heimteam" value={newMatch.homeTeam} onChange={(event) => setNewMatch({ ...newMatch, homeTeam: event.target.value })} />
        <input placeholder="Auswärtsteam" value={newMatch.awayTeam} onChange={(event) => setNewMatch({ ...newMatch, awayTeam: event.target.value })} />
        <input type="datetime-local" value={newMatch.kickoff} onChange={(event) => setNewMatch({ ...newMatch, kickoff: event.target.value })} />
        <input placeholder="Ort" value={newMatch.venue} onChange={(event) => setNewMatch({ ...newMatch, venue: event.target.value })} />
        <button className="primary" disabled={isPending}><Plus size={18} />Spiel anlegen</button>
      </form>

      <div className="admin-results">
        {matches.map((match) => <ResultForm key={match.id} match={match} run={run} isPending={isPending} />)}
      </div>

      <form
        className="admin-grid"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => apiPost("/api/admin/bonus", { ...question, points: Number(question.points), closesAt: new Date(question.closesAt).toISOString() }), "Bonusfrage gespeichert.");
        }}
      >
        <input placeholder="Bonusfrage" value={question.title} onChange={(event) => setQuestion({ ...question, title: event.target.value })} />
        <input type="datetime-local" value={question.closesAt} onChange={(event) => setQuestion({ ...question, closesAt: event.target.value })} />
        <input placeholder="Punkte" value={question.points} onChange={(event) => setQuestion({ ...question, points: event.target.value })} />
        <input placeholder="Richtige Antwort optional" value={question.answer} onChange={(event) => setQuestion({ ...question, answer: event.target.value })} />
        <button className="primary" disabled={isPending}><Plus size={18} />Bonus speichern</button>
      </form>
      {questions.length > 0 && <p className="hint">Vorhandene Bonusfragen kannst du erneut mit Antwort anlegen, wenn sie ausgewertet werden sollen.</p>}
    </section>
  );
}

function ResultForm({ match, run, isPending }: { match: Match; run: (action: () => Promise<void>, success?: string) => void; isPending: boolean }) {
  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? ""));
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? ""));
  const [status, setStatus] = useState(match.status);

  return (
    <form
      className="result-form"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => apiPost("/api/admin/results", { matchId: match.id, status, homeScore: homeScore === "" ? null : Number(homeScore), awayScore: awayScore === "" ? null : Number(awayScore) }), "Ergebnis gespeichert.");
      }}
    >
      <span>{match.homeTeam} - {match.awayTeam}</span>
      <input value={homeScore} onChange={(event) => setHomeScore(event.target.value)} />
      <input value={awayScore} onChange={(event) => setAwayScore(event.target.value)} />
      <select value={status} onChange={(event) => setStatus(event.target.value as Match["status"])}>
        <option value="SCHEDULED">Geplant</option>
        <option value="LIVE">Live</option>
        <option value="FINAL">Final</option>
      </select>
      <button className="icon-button" title="Ergebnis speichern" disabled={isPending}><Save size={17} /></button>
    </form>
  );
}

async function apiPost(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Das hat nicht geklappt.");
}

function groupMatches(matches: Match[]) {
  return matches.reduce<Record<string, Match[]>>((groups, match) => {
    const date = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date(match.kickoff));
    groups[date] = [...(groups[date] ?? []), match];
    return groups;
  }, {});
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
