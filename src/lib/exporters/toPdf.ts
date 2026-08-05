import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportRow } from '@/types';

const STATUS_COLORS: Record<string, [number, number, number]> = {
  clean: [21, 128, 61],
  needs_review: [146, 64, 14],
  duplicate: [185, 28, 28],
};

export function toPdf(rows: ExportRow[]): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Devotee Address Registry', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}   Records: ${rows.length}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [['#', 'Name', 'Primary Phone', 'Address', 'City', 'State', 'Country', 'Chapter', 'Status']],
    body: rows.map((r) => [
      r.serial, r.name, r.primaryPhone,
      [r.addressLine1, r.addressLine2, r.addressLine3].filter(Boolean).join(', '),
      r.city, r.state, r.country, r.chapter, r.status,
    ]),
    showHead: 'everyPage',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    didParseCell(data) {
      if (data.column.index === 8 && data.section === 'body') {
        const status = String(data.cell.raw);
        const color = STATUS_COLORS[status];
        if (color) data.cell.styles.textColor = color;
      }
    },
    didDrawPage(data) {
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  return Buffer.from(doc.output('arraybuffer'));
}
