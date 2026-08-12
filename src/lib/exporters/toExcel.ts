import ExcelJS from 'exceljs';
import type { ExportRow } from '@/types';
import { sanitizeSpreadsheetValue } from '@/lib/exporters/sanitizeSpreadsheetValue';

const headers: Array<[keyof ExportRow, string, number]> = [
  ['fullName', 'Full Name', 28],
  ['mobile', 'Mobile', 18],
  ['address', 'Address', 38],
  ['city', 'City', 20],
  ['state', 'State', 20],
  ['postalCode', 'PIN', 14],
  ['country', 'Country', 18],
  ['email', 'Email', 28],
];

export async function toExcel(rows: ExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Guru Bhavan Registry';
  const sheet = workbook.addWorksheet('People');
  sheet.columns = headers.map(([key, header, width]) => ({ key, header, width }));
  sheet.addRows(rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, sanitizeSpreadsheetValue(value)]),
  )));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: 'H1' };
  const firstRow = sheet.getRow(1);
  firstRow.height = 26;
  firstRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  firstRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
  firstRow.alignment = { vertical: 'middle' };
  sheet.getColumn('mobile').numFmt = '@';
  sheet.getColumn('postalCode').numFmt = '@';
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
