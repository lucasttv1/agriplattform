# AgriSmart Plattform

## Datenbank-Setup (PostgreSQL)

1. Lege die Tabelle für Felder an (z.B. mit psql oder DBeaver):

```sql
-- setup_fields.sql ausführen:
CREATE TABLE IF NOT EXISTS fields (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  size NUMERIC(10,2) NOT NULL,
  crop VARCHAR(100) NOT NULL,
  plantingDate DATE,
  notes TEXT,
  status VARCHAR(50),
  coordinates TEXT
);
```

2. Setze die Umgebungsvariable `DATABASE_URL` für Netlify Functions, z.B. in Netlify oder lokal in einer `.env`-Datei:

```
DATABASE_URL=postgres://user:pass@host:port/dbname
```

3. Starte das Projekt. Die Felder können jetzt gezeichnet, gespeichert und geladen werden.

## Fehlerdiagnose
- Bei Fehlern werden jetzt genaue Fehlermeldungen im Frontend angezeigt.
- Prüfe die Konsole und Alerts für Details (z.B. Datenbankverbindung, Tabellenschema).

## Hinweise
- Das SQL-Setup-Skript findest du in `setup_fields.sql`.
- Die Backend-Funktionen liegen in `netlify/functions/`.
- Frontend-Logik in `js/script.js`.