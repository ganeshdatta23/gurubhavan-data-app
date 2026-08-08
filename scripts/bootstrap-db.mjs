import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

function loadEnvironment() {
  for (const path of ['.env.local', '.env', '.env.example']) {
    if (!fs.existsSync(path)) continue;
    for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator < 1) continue;
      const name = line.slice(0, separator);
      if (!process.env[name]) process.env[name] = line.slice(separator + 1);
    }
  }
}

loadEnvironment();
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local.');
}

const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function columns(table) {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function tableExists(table) {
  const result = await client.execute({ sql: "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", args: [table] });
  return result.rows.length > 0;
}

const locationStatements = [
  `CREATE TABLE IF NOT EXISTS countries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, iso2 TEXT NOT NULL, phone_code TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS countries_name_idx ON countries(name)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS countries_iso2_idx ON countries(iso2)`,
  `CREATE TABLE IF NOT EXISTS states (id INTEGER PRIMARY KEY AUTOINCREMENT, country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE RESTRICT, name TEXT NOT NULL, code TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE INDEX IF NOT EXISTS states_country_idx ON states(country_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS states_country_name_unique ON states(name, country_id)`,
  `CREATE TABLE IF NOT EXISTS cities (id INTEGER PRIMARY KEY AUTOINCREMENT, state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT, name TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE INDEX IF NOT EXISTS cities_state_idx ON cities(state_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cities_state_name_unique ON cities(name, state_id)`,
  `INSERT INTO countries (name, iso2, phone_code) SELECT 'India', 'IN', '+91' WHERE NOT EXISTS (SELECT 1 FROM countries WHERE iso2='IN')`,
  `INSERT INTO states (country_id, name, code) SELECT id, 'Tamil Nadu', 'TN' FROM countries WHERE iso2='IN' AND NOT EXISTS (SELECT 1 FROM states WHERE states.country_id=countries.id AND states.name='Tamil Nadu')`,
  `INSERT INTO cities (state_id, name) SELECT id, 'Chennai' FROM states WHERE name='Tamil Nadu' AND NOT EXISTS (SELECT 1 FROM cities WHERE cities.state_id=states.id AND cities.name='Chennai')`,
];

for (const sql of locationStatements) await client.execute(sql);

const userColumns = await columns('users');
const devoteeColumns = await columns('devotees');
const legacySchema = userColumns.size > 0 && !userColumns.has('username');

if (legacySchema) {
  if (await tableExists('users_legacy_v1') || await tableExists('devotees_legacy_v1')) {
    throw new Error('A partial legacy migration was found. Restore or rename the *_legacy_v1 tables before retrying.');
  }
  await client.execute('PRAGMA foreign_keys=OFF');
  if (await tableExists('devotee_phones')) await client.execute('ALTER TABLE devotee_phones RENAME TO devotee_phones_legacy_v1');
  await client.execute('ALTER TABLE devotees RENAME TO devotees_legacy_v1');
  await client.execute('ALTER TABLE users RENAME TO users_legacy_v1');
}

// SQLite keeps index names when a table is renamed. Free the canonical names
// if an old backup table still owns them so the active table receives indexes.
for (const indexName of ['devotees_name_idx', 'devotees_city_idx', 'devotees_state_idx', 'devotees_country_idx', 'devotees_deleted_at_idx']) {
  const owner = await client.execute({ sql: "SELECT tbl_name FROM sqlite_master WHERE type='index' AND name=?", args: [indexName] });
  if (owner.rows[0] && owner.rows[0].tbl_name !== 'devotees') {
    await client.execute(`DROP INDEX ${indexName}`);
  }
}

const appStatements = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin' CHECK(role='admin'), is_active INTEGER NOT NULL DEFAULT 1, last_login_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username)`,
  `CREATE TABLE IF NOT EXISTS devotees (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT, address TEXT NOT NULL, city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT, state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT, country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE RESTRICT, postal_code TEXT, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL, deleted_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE INDEX IF NOT EXISTS devotees_name_idx ON devotees(full_name)`,
  `CREATE INDEX IF NOT EXISTS devotees_mobile_idx ON devotees(mobile)`,
  `CREATE INDEX IF NOT EXISTS devotees_city_idx ON devotees(city_id)`,
  `CREATE INDEX IF NOT EXISTS devotees_state_idx ON devotees(state_id)`,
  `CREATE INDEX IF NOT EXISTS devotees_country_idx ON devotees(country_id)`,
  `CREATE INDEX IF NOT EXISTS devotees_deleted_at_idx ON devotees(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS devotees_city_name_idx ON devotees(city_id, full_name)`,
];
for (const sql of appStatements) await client.execute(sql);

const accounts = [
  { id: 1, username: 'lakshminarayana', password: 'Gurubhavan@1942', name: 'Lakshminarayana' },
  { id: 2, username: 'volunteer', password: 'sdhsVol@1942', name: 'Volunteer' },
  { id: 3, username: 'admin', password: 'admin@1942', name: 'Admin' },
];
for (const account of accounts) {
  const passwordHash = await bcrypt.hash(account.password, 12);
  await client.execute({
    sql: `INSERT INTO users (id, username, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, 'admin', 1)
      ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash, name=excluded.name, role='admin', is_active=1, updated_at=unixepoch()`,
    args: [account.id, account.username, passwordHash, account.name],
  });
}

if (legacySchema && devoteeColumns.size > 0) {
  const phoneTable = await tableExists('devotee_phones_legacy_v1');
  const phoneExpression = phoneTable
    ? `(SELECT p.phone_number FROM devotee_phones_legacy_v1 p WHERE p.devotee_id=d.id ORDER BY p.is_primary DESC, p.id LIMIT 1)`
    : 'NULL';
  await client.execute(`INSERT INTO devotees (id, full_name, mobile, email, address, city_id, state_id, country_id, postal_code, created_by, updated_by, deleted_at, created_at, updated_at)
    SELECT d.id,
      trim(d.full_name),
      COALESCE(NULLIF(${phoneExpression}, ''), 'legacy' || d.id),
      NULL,
      COALESCE(NULLIF(trim(COALESCE(d.address_line1,'') || ' ' || COALESCE(d.address_line2,'') || ' ' || COALESCE(d.address_line3,'')), ''), 'Address not recorded'),
      COALESCE(d.city_id, (SELECT c.id FROM cities c WHERE c.state_id=d.state_id ORDER BY c.id LIMIT 1), (SELECT id FROM cities ORDER BY id LIMIT 1)),
      COALESCE(d.state_id, (SELECT state_id FROM cities WHERE id=d.city_id), (SELECT id FROM states ORDER BY id LIMIT 1)),
      COALESCE(d.country_id, (SELECT s.country_id FROM states s WHERE s.id=d.state_id), (SELECT id FROM countries ORDER BY id LIMIT 1)),
      d.postal_code,
      CASE WHEN d.created_by BETWEEN 1 AND 3 THEN d.created_by ELSE 3 END,
      CASE WHEN d.updated_by BETWEEN 1 AND 3 THEN d.updated_by ELSE 3 END,
      d.deleted_at,
      d.created_at,
      d.updated_at
    FROM devotees_legacy_v1 d`);
  await client.execute('PRAGMA foreign_keys=ON');
}

const [userCount, devoteeCount] = await Promise.all([
  client.execute('SELECT count(*) AS count FROM users'),
  client.execute('SELECT count(*) AS count FROM devotees'),
]);
console.log(`Database ready: ${userCount.rows[0].count} admins, ${devoteeCount.rows[0].count} devotees.`);
console.log('Tip: run `npm run db:seed-locations` to load cities/states from the devotee address workbook.');
