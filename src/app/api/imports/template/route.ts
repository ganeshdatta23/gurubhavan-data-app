import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
export const runtime = 'nodejs';
export async function GET() {
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Devotees');
  sheet.columns = [{ header: 'Full Name', key: 'fullName', width: 28 }, { header: 'Mobile Number', key: 'primaryPhone', width: 18 }, { header: 'Chapter', key: 'sourceGroup', width: 22 }, { header: 'Address Line 1', key: 'addressLine1', width: 32 }, { header: 'Country', key: 'country', width: 18 }, { header: 'State', key: 'state', width: 18 }, { header: 'City', key: 'city', width: 18 }, { header: 'Postal Code', key: 'postalCode', width: 14 }, { header: 'Notes', key: 'notes', width: 30 }, { header: 'WhatsApp Opted Out', key: 'whatsappOptedOut', width: 22 }];
  sheet.addRow({ fullName: 'Anita Sharma', primaryPhone: '919876543210', sourceGroup: 'Example Chapter', addressLine1: '12 Temple Road', country: 'India', state: 'Tamil Nadu', city: 'Chennai', postalCode: '600001', notes: '', whatsappOptedOut: 'No' });
  sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return new NextResponse(new Uint8Array(await workbook.xlsx.writeBuffer()), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="devotee-import-template.xlsx"' } });
}
