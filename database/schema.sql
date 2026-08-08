-- Guru Bhavan Registry: canonical Turso / LibSQL schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  iso2 TEXT NOT NULL,
  phone_code TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS countries_name_idx ON countries(name);
CREATE UNIQUE INDEX IF NOT EXISTS countries_iso2_idx ON countries(iso2);

CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS states_country_idx ON states(country_id);
CREATE UNIQUE INDEX IF NOT EXISTS states_country_name_unique ON states(name, country_id);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cities_state_idx ON cities(state_id);
CREATE UNIQUE INDEX IF NOT EXISTS cities_state_name_unique ON cities(name, state_id);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role = 'admin'),
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);

CREATE TABLE IF NOT EXISTS devotees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  postal_code TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS devotees_name_idx ON devotees(full_name);
CREATE INDEX IF NOT EXISTS devotees_mobile_idx ON devotees(mobile);
CREATE INDEX IF NOT EXISTS devotees_city_idx ON devotees(city_id);
CREATE INDEX IF NOT EXISTS devotees_state_idx ON devotees(state_id);
CREATE INDEX IF NOT EXISTS devotees_country_idx ON devotees(country_id);
CREATE INDEX IF NOT EXISTS devotees_deleted_at_idx ON devotees(deleted_at);
CREATE INDEX IF NOT EXISTS devotees_city_name_idx ON devotees(city_id, full_name);

INSERT INTO countries (name, iso2, phone_code)
SELECT 'India', 'IN', '+91'
WHERE NOT EXISTS (SELECT 1 FROM countries WHERE iso2 = 'IN');

INSERT INTO states (country_id, name, code)
SELECT id, 'Tamil Nadu', 'TN' FROM countries
WHERE iso2 = 'IN' AND NOT EXISTS (
  SELECT 1 FROM states WHERE name = 'Tamil Nadu' AND country_id = countries.id
);

INSERT INTO cities (state_id, name)
SELECT id, 'Chennai' FROM states
WHERE name = 'Tamil Nadu' AND NOT EXISTS (
  SELECT 1 FROM cities WHERE name = 'Chennai' AND state_id = states.id
);
