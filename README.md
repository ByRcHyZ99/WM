# WM Tippspiel

Eine kleine private Web-App für ein WM-Tippspiel mit Freunden. Die App nutzt PostgreSQL und läuft dadurch auch auf Render Free, wenn du eine externe Datenbank wie Neon verwendest.

## Funktionen

- Registrierung und Login mit Name und Passwort
- erster Account wird automatisch Admin
- Tipps pro Spiel bis Anstoß
- automatische Punktewertung:
  - 4 Punkte für exaktes Ergebnis
  - 3 Punkte für richtige Tordifferenz
  - 2 Punkte für richtige Tendenz
- Scoreboard für alle Mitspieler
- Bonusfragen wie Top-Torschütze oder Weltmeister
- Admin kann Spiele anlegen und Ergebnisse eintragen

## Lokal starten

1. `.env.example` nach `.env` kopieren.
2. In `.env` `DATABASE_URL` auf deinen Neon-Connection-String setzen.
3. In `.env` `APP_SECRET` und `ADMIN_CODE` ändern.
4. Pakete installieren und Datenbank vorbereiten:

```powershell
npm.cmd install
npm.cmd run setup
npm.cmd run dev
```

Danach läuft die App unter `http://localhost:3000`.

## Spielplan pflegen

Das Seed-Skript enthält einige Startspiele und Beispiele. Weitere Spiele kannst du direkt als Admin in der App anlegen.

Für aktuelle offizielle Daten nutze die FIFA-Spielplanseite:

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures

## Online hosten mit Render Free + Neon

Die einfachste Variante für eine Freundesgruppe:

1. Repository zu GitHub pushen.
2. Bei Render.com ein neues `Web Service` aus dem GitHub-Repo erstellen.
3. Build Command:

```bash
npm install && npm run build
```

4. Start Command:

```bash
npm run start
```

5. Environment Variables setzen:

```text
DATABASE_URL=<dein Neon connection string mit sslmode=require>
APP_SECRET=<langer-zufallswert>
ADMIN_CODE=<dein-admin-code>
```

6. Nach dem ersten Deploy einmal in der Render Shell ausführen:

```bash
npm run db:seed
```

Danach bekommen deine Freunde die Render-URL und können sich registrieren.

## Neon verbinden

1. In Neon auf **Connection string** bleiben.
2. **Show password** anklicken.
3. Den kompletten String kopieren.
4. In Render unter **Environment** als `DATABASE_URL` einfügen.
5. Der String muss ungefähr so aussehen:

```text
postgresql://neondb_owner:PASSWORT@HOST.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Du brauchst bei Render keinen Disk und keinen Mount Path.

## Wichtige Hinweise

- Ergebnisse werden nur gezählt, wenn ein Spiel auf `Final` steht.
- Tipps schließen automatisch, sobald die Kickoff-Zeit erreicht ist.
- Bonusfragen schließen über ihr `closesAt`-Datum.
- Teile den Admin-Code nur mit Personen, die Ergebnisse verwalten dürfen.
