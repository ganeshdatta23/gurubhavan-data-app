import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { cities, countries, devotees, devoteePhones, sourceGroups, states } from '@/db/schema';

export const runtime = 'nodejs';

type ImportRow = Record<string, string>;
type Issue = { row: number; column: string; value: string; reason: string };
type ValidRow = { row: number; fullName: string; primaryPhone: string; sourceGroupId: number; addressLine1: string | null; postalCode: string | null; notes: string | null; countryId: number | null; stateId: number | null; cityId: number | null; whatsappOptedOut: boolean };

const fields = ['fullName', 'primaryPhone', 'sourceGroup', 'addressLine1', 'country', 'state', 'city', 'postalCode', 'notes', 'whatsappOptedOut'] as const;
const aliases: Record<string, keyof ImportRow> = {
  'full name': 'fullName', name: 'fullName', 'mobile number': 'primaryPhone', mobile: 'primaryPhone', phone: 'primaryPhone',
  chapter: 'sourceGroup', 'source group': 'sourceGroup', 'address line 1': 'addressLine1', address: 'addressLine1',
  country: 'country', state: 'state', city: 'city', 'postal code': 'postalCode', pincode: 'postalCode', notes: 'notes', 'whatsapp opted out': 'whatsappOptedOut',
};
const clean = (value: unknown) => String(value ?? '').trim();
const normalize = (value: string) => value.trim().toLocaleLowerCase();

async function validate(rows: ImportRow[], sessionUserId: number): Promise<{ issues: Issue[]; validRows: ValidRow[] }> {
  const [groups, countryRows, stateRows, cityRows] = await Promise.all([
    db.select().from(sourceGroups), db.select().from(countries), db.select().from(states), db.select().from(cities),
  ]);
  const groupByName = new Map(groups.map((item) => [normalize(item.name), item.id]));
  const countryByName = new Map(countryRows.map((item) => [normalize(item.name), item.id]));
  const stateByKey = new Map(stateRows.map((item) => [`${item.countryId}:${normalize(item.name)}`, item.id]));
  const cityByKey = new Map(cityRows.map((item) => [`${item.stateId}:${normalize(item.name)}`, item.id]));
  const issues: Issue[] = [];
  const phones = new Set<string>();
  const validRows: ValidRow[] = [];
  const allPhones = rows.map((row) => clean(row.primaryPhone).replace(/\D/g, '')).filter(Boolean);
  const existing = allPhones.length ? await db.select({ phoneNumber: devoteePhones.phoneNumber }).from(devoteePhones).where(inArray(devoteePhones.phoneNumber, allPhones)) : [];
  const existingPhones = new Set(existing.map((item) => item.phoneNumber));

  rows.forEach((row, index) => {
    const excelRow = index + 2; const fullName = clean(row.fullName); const primaryPhone = clean(row.primaryPhone).replace(/\D/g, ''); const groupName = clean(row.sourceGroup);
    if (!fullName) issues.push({ row: excelRow, column: 'Full Name', value: fullName, reason: 'Full name is required.' });
    else if (fullName.length > 200) issues.push({ row: excelRow, column: 'Full Name', value: fullName, reason: 'Maximum length is 200 characters.' });
    if (!primaryPhone) issues.push({ row: excelRow, column: 'Mobile Number', value: clean(row.primaryPhone), reason: 'Mobile number is required.' });
    else if (!/^\d{7,15}$/.test(primaryPhone)) issues.push({ row: excelRow, column: 'Mobile Number', value: clean(row.primaryPhone), reason: 'Use 7–15 digits, optionally with spaces or punctuation.' });
    else if (phones.has(primaryPhone)) issues.push({ row: excelRow, column: 'Mobile Number', value: primaryPhone, reason: 'This mobile number appears more than once in this file.' });
    else if (existingPhones.has(primaryPhone)) issues.push({ row: excelRow, column: 'Mobile Number', value: primaryPhone, reason: 'This mobile number is already registered.' });
    phones.add(primaryPhone);
    const sourceGroupId = groupByName.get(normalize(groupName));
    if (!groupName) issues.push({ row: excelRow, column: 'Chapter', value: groupName, reason: 'Chapter is required.' });
    else if (!sourceGroupId) issues.push({ row: excelRow, column: 'Chapter', value: groupName, reason: 'Chapter does not exist. Use an existing chapter name.' });
    const countryName = clean(row.country); const stateName = clean(row.state); const cityName = clean(row.city);
    const countryId = countryName ? countryByName.get(normalize(countryName)) : null;
    if (countryName && !countryId) issues.push({ row: excelRow, column: 'Country', value: countryName, reason: 'Country does not exist.' });
    const stateId = stateName && countryId ? stateByKey.get(`${countryId}:${normalize(stateName)}`) : null;
    if (stateName && !countryId) issues.push({ row: excelRow, column: 'State', value: stateName, reason: 'Select a valid country before state.' });
    else if (stateName && !stateId) issues.push({ row: excelRow, column: 'State', value: stateName, reason: 'State does not belong to the selected country.' });
    const cityId = cityName && stateId ? cityByKey.get(`${stateId}:${normalize(cityName)}`) : null;
    if (cityName && !stateId) issues.push({ row: excelRow, column: 'City', value: cityName, reason: 'Select a valid state before city.' });
    else if (cityName && !cityId) issues.push({ row: excelRow, column: 'City', value: cityName, reason: 'City does not belong to the selected state.' });
    const optOutRaw = clean(row.whatsappOptedOut).toLowerCase();
    if (optOutRaw && !['yes', 'no', 'true', 'false', '1', '0'].includes(optOutRaw)) issues.push({ row: excelRow, column: 'WhatsApp Opted Out', value: optOutRaw, reason: 'Use Yes or No.' });
    validRows.push({ row: excelRow, fullName, primaryPhone, sourceGroupId: sourceGroupId ?? 0, addressLine1: clean(row.addressLine1) || null, postalCode: clean(row.postalCode) || null, notes: clean(row.notes) || null, countryId: countryId ?? null, stateId: stateId ?? null, cityId: cityId ?? null, whatsappOptedOut: ['yes', 'true', '1'].includes(optOutRaw) });
  });
  return { issues, validRows };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !['super_admin', 'admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null) as { rows?: ImportRow[]; commit?: boolean } | null;
  if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 2000) return NextResponse.json({ error: 'Provide 1 to 2,000 rows to import.' }, { status: 400 });
  const { issues, validRows } = await validate(body.rows, session.userId);
  if (!body.commit || issues.length) return NextResponse.json({ valid: issues.length === 0, issues, rows: body.rows });
  for (const row of validRows) {
    const [devotee] = await db.insert(devotees).values({ fullName: row.fullName, sourceGroupId: row.sourceGroupId, addressLine1: row.addressLine1, postalCode: row.postalCode, notes: row.notes, countryId: row.countryId, stateId: row.stateId, cityId: row.cityId, whatsappOptedOut: row.whatsappOptedOut, recordStatus: 'needs_review', createdBy: session.userId, updatedBy: session.userId }).returning();
    await db.insert(devoteePhones).values({ devoteeId: devotee.id, phoneNumber: row.primaryPhone, isPrimary: true });
  }
  return NextResponse.json({ imported: validRows.length });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !['super_admin', 'admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File) || !file.name.match(/\.xlsx$/i)) return NextResponse.json({ error: 'Upload an .xlsx Excel file.' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'The Excel file must be 5 MB or smaller.' }, { status: 400 });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer()); const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return NextResponse.json({ error: 'The workbook needs a header row and at least one data row.' }, { status: 400 });
  const headers = new Map<number, string>(); sheet.getRow(1).eachCell((cell, column) => { const key = aliases[normalize(clean(cell.text))]; if (key) headers.set(column, key); });
  if (!Array.from(headers.values()).includes('fullName') || !Array.from(headers.values()).includes('primaryPhone') || !Array.from(headers.values()).includes('sourceGroup')) return NextResponse.json({ error: 'Required columns: Full Name, Mobile Number, and Chapter.' }, { status: 400 });
  const rows: ImportRow[] = []; sheet.eachRow((row, number) => { if (number === 1) return; const item: ImportRow = {}; headers.forEach((name, column) => { item[name] = clean(row.getCell(column).text); }); if (Object.values(item).some(Boolean)) rows.push(item); });
  const result = await validate(rows, session.userId); return NextResponse.json({ valid: result.issues.length === 0, issues: result.issues, rows });
}
