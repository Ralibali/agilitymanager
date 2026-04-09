/**
 * Generate and download a PDF from tabular data using jsPDF + autoTable.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  filename: string;
  landscape?: boolean;
}

export function downloadPdf({ title, subtitle, headers, rows, filename, landscape }: PdfOptions) {
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 18);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitle, 14, 25);
    doc.setTextColor(0);
  }

  autoTable(doc, {
    startY: subtitle ? 30 : 24,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 90], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`AgilityManager – ${new Date().toLocaleDateString('sv-SE')}`, 14, pageH - 8);
    doc.text(`Sida ${i}/${pageCount}`, doc.internal.pageSize.getWidth() - 14, pageH - 8, { align: 'right' });
  }

  doc.save(filename);
}
