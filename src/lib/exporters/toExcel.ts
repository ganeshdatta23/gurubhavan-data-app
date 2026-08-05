import ExcelJS from 'exceljs';
import type { ExportRow } from '@/types';

const HEADERS = ['#', 'Name', 'Primary Phone', 'Secondary Phones', 'Address 1', 'Address 2', 'Address 3', 'City', 'State', 'Country', 'Postal Code', 'Chapter', 'Status', 'Flags'];
const STATUS_COLORS: Record<string, string> = { clean: 'FF15803D', needs_review: 'FF92400E', duplicate: 'FFB91C1C' };

export async function toExcel(rows: ExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Devotees');

  ws.addRow(HEADERS);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
  headerRow.alignment = { vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + HEADERS.length)}1` };

  for (const row of rows) {
    const r = ws.addRow([
      row.serial, row.name, row.primaryPhone, row.secondaryPhones,
      row.addressLine1, row.addressLine2, row.addressLine3,
      row.city, row.state, row.country, row.postalCode,
      row.chapter, row.status, row.flags,
    ]);

    // Alternating row shading
    if (row.serial % 2 === 0) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
    }

    // Status column color
    const statusCell = r.getCell(13);
    const color = STATUS_COLORS[row.status];
    if (color) statusCell.font = { color: { argb: color } };
  }

  // Auto-width
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 3, 50);
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
