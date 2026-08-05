import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, ShadingType, HeadingLevel,
} from 'docx';
import type { ExportRow } from '@/types';

const HEADERS = ['#', 'Name', 'Primary Phone', 'Address', 'City', 'State', 'Country', 'Chapter', 'Status'];

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: '2D3748' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })] })],
  });
}

function dataCell(text: string, shade: boolean): TableCell {
  return new TableCell({
    shading: shade ? { type: ShadingType.SOLID, color: 'F7FAFC' } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
  });
}

export async function toDocx(rows: ExportRow[]): Promise<Buffer> {
  const tableRows: TableRow[] = [
    new TableRow({ children: HEADERS.map(headerCell), tableHeader: true }),
    ...rows.map((r, i) => {
      const shade = i % 2 === 1;
      const address = [r.addressLine1, r.addressLine2, r.addressLine3].filter(Boolean).join(', ');
      return new TableRow({
        children: [
          dataCell(String(r.serial), shade),
          dataCell(r.name, shade),
          dataCell(r.primaryPhone, shade),
          dataCell(address, shade),
          dataCell(r.city, shade),
          dataCell(r.state, shade),
          dataCell(r.country, shade),
          dataCell(r.chapter, shade),
          dataCell(r.status, shade),
        ],
      });
    }),
  ];

  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: 'landscape' } } },
      children: [
        new Paragraph({
          text: 'Devotee Address Registry',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-IN')}   Records: ${rows.length}`, size: 18 })],
          spacing: { after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
