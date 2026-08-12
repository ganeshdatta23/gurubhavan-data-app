import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/db';
import { devotees } from '@/db/schema';
import { findCityByName, findCountryByName, findStateByName } from '@/db/queries/lookups';
import { requireAdmin } from '@/lib/auth';
import { findActiveDuplicate, normalizeDevoteeMobile, validateLocation } from '@/lib/devotee-service';
import { devoteeFormSchema } from '@/lib/validators';
import { isSameOriginMutation } from '@/lib/mutation-origin';

export const runtime = 'nodejs';

const maxFileSize = 5 * 1024 * 1024;
const maxRows = 5000;
type ImportRow = { row: number; fullName: string; mobile: string; address: string; city: string; state: string; postalCode: string; country: string; email: string };
type CheckedRow = { row: number; name: string; reason?: string; data?: Record<string, unknown> };

function text(value: ExcelJS.CellValue) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object' && 'richText' in value) return value.richText.map((part) => part.text).join('');
  return String(value ?? '').trim();
}

function headerKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function readRows(file: File) {
  if (file.size > maxFileSize) throw new Error('Choose an Excel file smaller than 5 MB.');
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Upload an .xlsx Excel file.');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()) as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook does not contain a sheet.');
  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => headerMap.set(headerKey(text(cell.value)), column));
  const required = ['fullname', 'mobile', 'address', 'city', 'state', 'country'];
  const missing = required.filter((key) => !headerMap.has(key));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}.`);
  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || rows.length >= maxRows) return;
    const get = (key: string) => text(row.getCell(headerMap.get(key) ?? 0).value);
    const values = { row: rowNumber, fullName: get('fullname'), mobile: get('mobile'), address: get('address'), city: get('city'), state: get('state'), postalCode: get('pin'), country: get('country'), email: get('email') };
    if (Object.values(values).some((value) => value && value !== rowNumber)) rows.push(values);
  });
  if (rows.length >= maxRows) throw new Error(`Files can contain at most ${maxRows.toLocaleString()} data rows.`);
  return rows;
}

async function checkRows(rows: ImportRow[]) {
  const checked: CheckedRow[] = [];
  const ready: Array<{ row: number; data: Record<string, unknown> }> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const country = await findCountryByName(row.country);
    const state = country ? await findStateByName(country.id, row.state) : null;
    const city = state ? await findCityByName(state.id, row.city) : null;
    const base = { fullName: row.fullName, mobile: row.mobile, address: row.address, countryId: country?.id ?? 0, stateId: state?.id ?? 0, cityId: city?.id ?? 0, postalCode: row.postalCode, email: row.email };
    const parsed = devoteeFormSchema.safeParse(base);
    let reason = !country ? 'Country was not found.' : !state ? 'State was not found under that country.' : !city ? 'City was not found under that state.' : parsed.success ? '' : parsed.error.errors[0].message;
    if (!reason && country) {
      const normalized = await normalizeDevoteeMobile({ ...base, countryId: country.id, stateId: state!.id, cityId: city!.id } as never);
      if ('error' in normalized) reason = normalized.error;
      else if (seen.has(`${country.id}:${normalized.mobile}`)) reason = 'Duplicate mobile number in this file.';
      else if (await findActiveDuplicate(normalized.mobile, country.id)) reason = 'This mobile number is already in the list.';
      else seen.add(`${country.id}:${normalized.mobile}`);
    }
    if (!reason && parsed.success) {
      const data = { ...parsed.data, mobile: String(parsed.data.mobile) };
      const locationError = await validateLocation(data);
      if (locationError) reason = locationError;
      else ready.push({ row: row.row, data });
    }
    checked.push(reason ? { row: row.row, name: row.fullName || '(unnamed)', reason } : { row: row.row, name: row.fullName });
  }
  return { checked, ready };
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const session = await requireAdmin();
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an Excel file.' }, { status: 400 });
  try {
    const rows = await readRows(file);
    const result = await checkRows(rows);
    if (form.get('action') === 'import') {
      const now = new Date();
      await db.transaction(async (tx) => {
        for (const item of result.ready) {
          await tx.insert(devotees).values({ ...item.data, createdBy: session.userId, updatedBy: session.userId, createdAt: now, updatedAt: now } as never);
        }
      });
    }
    return NextResponse.json({ total: rows.length, ready: result.ready.length, problems: result.checked.filter((item) => item.reason), rows: result.checked, imported: form.get('action') === 'import' ? result.ready.length : 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read this Excel file.' }, { status: 400 });
  }
}
