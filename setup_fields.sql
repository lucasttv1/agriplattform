-- SQL-Skript zum Anlegen der Tabelle "fields" für AgriSmart
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
