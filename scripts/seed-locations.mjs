/**
 * Seed countries / states / cities:
 * - All Indian states + UTs (always)
 * - Cities from the latest devotee address workbook sheet names
 *
 * Safe to rerun.
 *
 *   npm run db:seed-locations
 *   node scripts/seed-locations.mjs "/path/to/Devotees Addressess List.xlsx"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import ExcelJS from 'exceljs';

function loadEnvironment() {
  for (const envPath of ['.env.local', '.env', '.env.example']) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/** Every Indian state + UT with a default city (usually capital) so the City select is never empty. */
const ALL_INDIA_STATES = [
  { state: 'Andaman and Nicobar Islands', city: 'Port Blair', code: 'AN' },
  { state: 'Andhra Pradesh', city: 'Amaravati', code: 'AP' },
  { state: 'Arunachal Pradesh', city: 'Itanagar', code: 'AR' },
  { state: 'Assam', city: 'Dispur', code: 'AS' },
  { state: 'Bihar', city: 'Patna', code: 'BR' },
  { state: 'Chandigarh', city: 'Chandigarh', code: 'CH' },
  { state: 'Chhattisgarh', city: 'Raipur', code: 'CG' },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Daman', code: 'DH' },
  { state: 'Delhi', city: 'New Delhi', code: 'DL' },
  { state: 'Goa', city: 'Panaji', code: 'GA' },
  { state: 'Gujarat', city: 'Gandhinagar', code: 'GJ' },
  { state: 'Haryana', city: 'Chandigarh', code: 'HR' },
  { state: 'Himachal Pradesh', city: 'Shimla', code: 'HP' },
  { state: 'Jammu and Kashmir', city: 'Srinagar', code: 'JK' },
  { state: 'Jharkhand', city: 'Ranchi', code: 'JH' },
  { state: 'Karnataka', city: 'Bengaluru', code: 'KA' },
  { state: 'Kerala', city: 'Thiruvananthapuram', code: 'KL' },
  { state: 'Ladakh', city: 'Leh', code: 'LA' },
  { state: 'Lakshadweep', city: 'Kavaratti', code: 'LD' },
  { state: 'Madhya Pradesh', city: 'Bhopal', code: 'MP' },
  { state: 'Maharashtra', city: 'Mumbai', code: 'MH' },
  { state: 'Manipur', city: 'Imphal', code: 'MN' },
  { state: 'Meghalaya', city: 'Shillong', code: 'ML' },
  { state: 'Mizoram', city: 'Aizawl', code: 'MZ' },
  { state: 'Nagaland', city: 'Kohima', code: 'NL' },
  { state: 'Odisha', city: 'Bhubaneswar', code: 'OD' },
  { state: 'Puducherry', city: 'Puducherry', code: 'PY' },
  { state: 'Punjab', city: 'Chandigarh', code: 'PB' },
  { state: 'Rajasthan', city: 'Jaipur', code: 'RJ' },
  { state: 'Sikkim', city: 'Gangtok', code: 'SK' },
  { state: 'Tamil Nadu', city: 'Chennai', code: 'TN' },
  { state: 'Telangana', city: 'Hyderabad', code: 'TS' },
  { state: 'Tripura', city: 'Agartala', code: 'TR' },
  { state: 'Uttar Pradesh', city: 'Lucknow', code: 'UP' },
  { state: 'Uttarakhand', city: 'Dehradun', code: 'UK' },
  { state: 'West Bengal', city: 'Kolkata', code: 'WB' },
];

/** Extra cities from Devotees Addressess List.xlsx (canonical names). */
const EXTRA_CITIES = [
  // Andhra Pradesh
  { city: 'Allagadda', state: 'Andhra Pradesh' },
  { city: 'Addanki', state: 'Andhra Pradesh' },
  { city: 'Bhimavaram', state: 'Andhra Pradesh' },
  { city: 'Eluru', state: 'Andhra Pradesh' },
  { city: 'Nellore', state: 'Andhra Pradesh' },
  { city: 'Vijayawada', state: 'Andhra Pradesh' },
  { city: 'Guntur', state: 'Andhra Pradesh' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { city: 'Srikakulam', state: 'Andhra Pradesh' },
  { city: 'Kaikaluru', state: 'Andhra Pradesh' },
  { city: 'Rajahmundry', state: 'Andhra Pradesh' },
  { city: 'Pithapuram', state: 'Andhra Pradesh' },
  { city: 'Ongole', state: 'Andhra Pradesh' },
  { city: 'Paruchuru', state: 'Andhra Pradesh' },
  { city: 'Gudivada', state: 'Andhra Pradesh' },
  { city: 'Dharmavaram', state: 'Andhra Pradesh' },
  { city: 'Gannavaram', state: 'Andhra Pradesh' },
  { city: 'Chirala', state: 'Andhra Pradesh' },
  { city: 'Gandigunta', state: 'Andhra Pradesh' },
  { city: 'Chittoor', state: 'Andhra Pradesh' },
  { city: 'Tirupati', state: 'Andhra Pradesh' },
  { city: 'Kakinada', state: 'Andhra Pradesh' },
  { city: 'Hindupur', state: 'Andhra Pradesh' },
  { city: 'Kadapa', state: 'Andhra Pradesh' },
  { city: 'Akividu', state: 'Andhra Pradesh' },
  { city: 'Kurnool', state: 'Andhra Pradesh' },
  { city: 'Nuzvidu', state: 'Andhra Pradesh' },
  { city: 'Madanapalle', state: 'Andhra Pradesh' },
  { city: 'Anantapur', state: 'Andhra Pradesh' },
  { city: 'Machilipatnam', state: 'Andhra Pradesh' },
  { city: 'Proddatur', state: 'Andhra Pradesh' },
  { city: 'Velagapudi', state: 'Andhra Pradesh' },
  { city: 'Amalapuram', state: 'Andhra Pradesh' },
  { city: 'Rapthadu', state: 'Andhra Pradesh' },
  // Telangana
  { city: 'Khammam', state: 'Telangana' },
  { city: 'Karimnagar', state: 'Telangana' },
  { city: 'Nizamabad', state: 'Telangana' },
  { city: 'Mahabubnagar', state: 'Telangana' },
  { city: 'Kamareddy', state: 'Telangana' },
  { city: 'Warangal', state: 'Telangana' },
  // Karnataka
  { city: 'Ballari', state: 'Karnataka' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Shivamogga', state: 'Karnataka' },
  { city: 'Udupi', state: 'Karnataka' },
  { city: 'Tumakuru', state: 'Karnataka' },
  { city: 'Koppal', state: 'Karnataka' },
  { city: 'Gangavathi', state: 'Karnataka' },
  // Tamil Nadu
  { city: 'Vellore', state: 'Tamil Nadu' },
  // Kerala
  { city: 'Palakkad', state: 'Kerala' },
  { city: 'Thrissur', state: 'Kerala' },
  // Gujarat
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Halol', state: 'Gujarat' },
  // Rajasthan
  { city: 'Jaisalmer', state: 'Rajasthan' },
];

const OTHER_COUNTRIES = [
  { country: 'United States', iso2: 'US', phone: '+1', state: 'Illinois', city: 'Hoffman Estates' },
  { country: 'United States', iso2: 'US', phone: '+1', state: 'Maryland', city: 'Clarksburg' },
  { country: 'Australia', iso2: 'AU', phone: '+61', state: 'Victoria', city: 'Melbourne' },
  { country: 'Australia', iso2: 'AU', phone: '+61', state: 'Queensland', city: 'Townsville' },
];

const SHEET_ALIASES = {
  allagada: { city: 'Allagadda', state: 'Andhra Pradesh' },
  addanki: { city: 'Addanki', state: 'Andhra Pradesh' },
  bangalore: { city: 'Bengaluru', state: 'Karnataka' },
  bhimavaram: { city: 'Bhimavaram', state: 'Andhra Pradesh' },
  eluru: { city: 'Eluru', state: 'Andhra Pradesh' },
  nellore: { city: 'Nellore', state: 'Andhra Pradesh' },
  vellore: { city: 'Vellore', state: 'Tamil Nadu' },
  vijayawada: { city: 'Vijayawada', state: 'Andhra Pradesh' },
  guntur: { city: 'Guntur', state: 'Andhra Pradesh' },
  vizag: { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  khammam: { city: 'Khammam', state: 'Telangana' },
  srikakulam: { city: 'Srikakulam', state: 'Andhra Pradesh' },
  karimnagar: { city: 'Karimnagar', state: 'Telangana' },
  kaikaluru: { city: 'Kaikaluru', state: 'Andhra Pradesh' },
  ballari: { city: 'Ballari', state: 'Karnataka' },
  rajahmundry: { city: 'Rajahmundry', state: 'Andhra Pradesh' },
  pithapuram: { city: 'Pithapuram', state: 'Andhra Pradesh' },
  ongole: { city: 'Ongole', state: 'Andhra Pradesh' },
  paruchuru: { city: 'Paruchuru', state: 'Andhra Pradesh' },
  nizamabad: { city: 'Nizamabad', state: 'Telangana' },
  mahaubnagar: { city: 'Mahabubnagar', state: 'Telangana' },
  kamareddy: { city: 'Kamareddy', state: 'Telangana' },
  mysuru: { city: 'Mysuru', state: 'Karnataka' },
  gudiwada: { city: 'Gudivada', state: 'Andhra Pradesh' },
  dharmavaram: { city: 'Dharmavaram', state: 'Andhra Pradesh' },
  gannavaram: { city: 'Gannavaram', state: 'Andhra Pradesh' },
  chirala: { city: 'Chirala', state: 'Andhra Pradesh' },
  gandigunta: { city: 'Gandigunta', state: 'Andhra Pradesh' },
  chennai: { city: 'Chennai', state: 'Tamil Nadu' },
  chittoor: { city: 'Chittoor', state: 'Andhra Pradesh' },
  thirupathi: { city: 'Tirupati', state: 'Andhra Pradesh' },
  shimoga: { city: 'Shivamogga', state: 'Karnataka' },
  kakinada: { city: 'Kakinada', state: 'Andhra Pradesh' },
  warangal: { city: 'Warangal', state: 'Telangana' },
  hindupur: { city: 'Hindupur', state: 'Andhra Pradesh' },
  udupi: { city: 'Udupi', state: 'Karnataka' },
  kadapa: { city: 'Kadapa', state: 'Andhra Pradesh' },
  hyderabad: { city: 'Hyderabad', state: 'Telangana' },
  akividu: { city: 'Akividu', state: 'Andhra Pradesh' },
  kurnool: { city: 'Kurnool', state: 'Andhra Pradesh' },
  nuzvidu: { city: 'Nuzvidu', state: 'Andhra Pradesh' },
  tumkur: { city: 'Tumakuru', state: 'Karnataka' },
  madanapally: { city: 'Madanapalle', state: 'Andhra Pradesh' },
  kerala: { city: 'Palakkad', state: 'Kerala' },
  ananthapur: { city: 'Anantapur', state: 'Andhra Pradesh' },
  machlipatnam: { city: 'Machilipatnam', state: 'Andhra Pradesh' },
  prodduttur: { city: 'Proddatur', state: 'Andhra Pradesh' },
  mumbai: { city: 'Mumbai', state: 'Maharashtra' },
  valagapudi: { city: 'Velagapudi', state: 'Andhra Pradesh' },
  amalapuram: { city: 'Amalapuram', state: 'Andhra Pradesh' },
  rapthadu: { city: 'Rapthadu', state: 'Andhra Pradesh' },
  gujarat: { city: 'Surat', state: 'Gujarat' },
  koppal: { city: 'Koppal', state: 'Karnataka' },
  usa: { city: 'Hoffman Estates', state: 'Illinois', country: 'United States', iso2: 'US', phone: '+1' },
  australia: { city: 'Melbourne', state: 'Victoria', country: 'Australia', iso2: 'AU', phone: '+61' },
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function ensureCountry(name, iso2, phone) {
  await client.execute({
    sql: `INSERT INTO countries (name, iso2, phone_code)
      SELECT ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM countries WHERE iso2 = ?)`,
    args: [name, iso2, phone, iso2],
  });
  const result = await client.execute({
    sql: 'SELECT id FROM countries WHERE iso2 = ? LIMIT 1',
    args: [iso2],
  });
  return Number(result.rows[0].id);
}

async function ensureState(countryId, name, code = null) {
  await client.execute({
    sql: `INSERT INTO states (country_id, name, code)
      SELECT ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id = ? AND name = ?)`,
    args: [countryId, name, code, countryId, name],
  });
  // Keep code filled if row already existed without one
  if (code) {
    await client.execute({
      sql: `UPDATE states SET code = COALESCE(NULLIF(code, ''), ?) WHERE country_id = ? AND name = ?`,
      args: [code, countryId, name],
    });
  }
  const result = await client.execute({
    sql: 'SELECT id FROM states WHERE country_id = ? AND name = ? LIMIT 1',
    args: [countryId, name],
  });
  return Number(result.rows[0].id);
}

async function ensureCity(stateId, name) {
  await client.execute({
    sql: `INSERT INTO cities (state_id, name)
      SELECT ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM cities WHERE state_id = ? AND name = ?)`,
    args: [stateId, name, stateId, name],
  });
}

async function readSheetNames(excelPath) {
  if (!excelPath || !fs.existsSync(excelPath)) return [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  return workbook.worksheets.map((sheet) => sheet.name);
}

async function main() {
  const defaultExcel = path.join(process.env.HOME || '', 'Downloads', 'Devotees Addressess List.xlsx');
  const excelPath = process.argv[2] || defaultExcel;
  const sheetNames = await readSheetNames(excelPath);
  console.log(`Excel: ${excelPath}`);
  console.log(`Sheets found: ${sheetNames.length || 0}`);

  const indiaId = await ensureCountry('India', 'IN', '+91');

  // 1) All Indian states + UTs (with at least one city each)
  for (const row of ALL_INDIA_STATES) {
    const stateId = await ensureState(indiaId, row.state, row.code);
    await ensureCity(stateId, row.city);
  }
  console.log(`India: ensured ${ALL_INDIA_STATES.length} states/UTs with default cities.`);

  // 2) Extra cities from catalog
  const stateIdCache = new Map();
  async function stateIdFor(stateName, countryId = indiaId, code = null) {
    const key = `${countryId}|${stateName}`;
    if (!stateIdCache.has(key)) {
      stateIdCache.set(key, await ensureState(countryId, stateName, code));
    }
    return stateIdCache.get(key);
  }

  for (const row of EXTRA_CITIES) {
    const stateId = await stateIdFor(row.state);
    await ensureCity(stateId, row.city);
  }

  // 3) Match Excel sheets
  let matched = 0;
  const skipped = [];
  for (const raw of sheetNames) {
    const key = normalizeKey(raw);
    if (!key || ['rough entry', 'sheet5', 'rss'].includes(key)) {
      skipped.push(raw);
      continue;
    }
    const mapped = SHEET_ALIASES[key];
    if (!mapped) {
      skipped.push(raw);
      continue;
    }
    matched += 1;
    if (mapped.iso2 && mapped.iso2 !== 'IN') {
      const countryId = await ensureCountry(mapped.country, mapped.iso2, mapped.phone);
      const stateId = await ensureState(countryId, mapped.state);
      await ensureCity(stateId, mapped.city);
    } else {
      const stateId = await stateIdFor(mapped.state);
      await ensureCity(stateId, mapped.city);
    }
  }

  // 4) Other countries used in the workbook
  for (const row of OTHER_COUNTRIES) {
    const countryId = await ensureCountry(row.country, row.iso2, row.phone);
    const stateId = await ensureState(countryId, row.state);
    await ensureCity(stateId, row.city);
  }

  const [countries, states, cities, indiaStates] = await Promise.all([
    client.execute('SELECT count(*) AS n FROM countries'),
    client.execute('SELECT count(*) AS n FROM states'),
    client.execute('SELECT count(*) AS n FROM cities'),
    client.execute(`SELECT count(*) AS n FROM states s JOIN countries c ON c.id = s.country_id WHERE c.iso2 = 'IN'`),
  ]);

  const indiaList = await client.execute(`
    SELECT s.name, count(ci.id) AS cities
    FROM states s
    JOIN countries c ON c.id = s.country_id
    LEFT JOIN cities ci ON ci.state_id = s.id
    WHERE c.iso2 = 'IN'
    GROUP BY s.id
    ORDER BY s.name
  `);

  console.log(`Excel sheets matched: ${matched}; skipped: ${skipped.join(', ') || 'none'}`);
  console.log(
    `Totals: ${countries.rows[0].n} countries, ${states.rows[0].n} states, ${cities.rows[0].n} cities`,
  );
  console.log(`India states/UTs in DB: ${indiaStates.rows[0].n}`);
  for (const row of indiaList.rows) {
    console.log(`  ${row.name}: ${row.cities} cities`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
