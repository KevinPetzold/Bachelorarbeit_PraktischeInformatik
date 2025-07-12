import fs from 'fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';

// images = Array von Dateipfaden (JPEG/PNG oder PDF)
// texts = OCR-Texte (Array, leere Felder/Kein OCR für PDFs okay)
// metadata = deine Metadaten (optional)

export async function generatePDF({ images, texts = [], metadata = {} }) {
  // 1. Neues, leeres PDF erzeugen
  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < images.length; i++) {
    const filePath = images[i];
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      // === PDF: Alle Seiten übernehmen ===
      const pdfBytes = await fs.readFile(filePath);
      const srcPdf = await PDFDocument.load(pdfBytes);
      const srcPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      srcPages.forEach(p => mergedPdf.addPage(p));
      // Optional: Du könntest hier ein Wasserzeichen oder einen Hinweis hinzufügen
    } else {
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const imgBytes = await fs.readFile(filePath);
let imgEmbed, dims;
if (ext === '.jpg' || ext === '.jpeg') {
  imgEmbed = await mergedPdf.embedJpg(imgBytes);
  dims = imgEmbed.scale(1);
} else if (ext === '.png') {
  imgEmbed = await mergedPdf.embedPng(imgBytes);
  dims = imgEmbed.scale(1);
} else {
  throw new Error(`Nicht unterstütztes Bildformat: ${filePath}`);
}

// Berechne das Verhältnis, damit das Bild in A4 passt, ohne gestreckt zu werden:
const scale = Math.min(
  A4_WIDTH / dims.width,
  A4_HEIGHT / dims.height,
  1 // Nicht hochskalieren!
);

const scaledWidth = dims.width * scale;
const scaledHeight = dims.height * scale;

// Zentriere das Bild auf der A4-Seite:
const x = (A4_WIDTH - scaledWidth) / 2;
const y = (A4_HEIGHT - scaledHeight) / 2;

// Füge eine A4-Seite hinzu:
const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);

page.drawImage(imgEmbed, {
  x,
  y,
  width: scaledWidth,
  height: scaledHeight,
});

      // === Unsichtbaren OCR-Text drauflegen (falls vorhanden und sinnvoll) ===
      const text = texts[i];
      if (text && !/kein\s*ocr/i.test(text)) {
        // Unsichtbarer Text – für Suchbarkeit
        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        page.drawText(text, {
          x: 5, y: dims.height - 20, // Start irgendwo im Bild (nur grob!)
          size: 10,
          color: rgb(0, 0, 0),
          opacity: 0, // unsichtbar
          font,
          maxWidth: dims.width - 10,
        });
      }
    }
  }

  // Optional: Metadaten setzen
  if (metadata) {
    mergedPdf.setTitle(`Rechnung ${metadata.invoiceNumber || ''}`);
    mergedPdf.setSubject(`Budget: ${metadata.budgetId || ''} (${metadata.year || ''})`);
    mergedPdf.setKeywords([metadata.budgetId, metadata.invoiceNumber, metadata.userId].filter(Boolean));
    mergedPdf.setAuthor(`NutzerID: ${metadata.userId || ''}`);
  }

  // Optional: Übersicht hinten anhängen
  if (metadata.appendSummaryPage) {
    const page = mergedPdf.addPage([595, 842]); // A4
    const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    page.drawText('Rechnungsübersicht', { x: 70, y: 790, size: 20, font, color: rgb(0.1,0.1,0.1) });
    page.drawText(`Budget ID: ${metadata.budgetId || ''}`, { x: 70, y: 770, size: 14 });
    page.drawText(`Rechnungs-Nr.: ${metadata.invoiceNumber || ''}`, { x: 70, y: 750, size: 14 });
    page.drawText(`Jahr: ${metadata.year || ''}`, { x: 70, y: 730, size: 14 });
    page.drawText(`User: ${metadata.userId || ''}`, { x: 70, y: 710, size: 14 });
  }

  // 2. PDF abspeichern
  const outputDir = path.join(process.cwd(), 'output');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${metadata.budgetId}_${metadata.invoiceNumber}_${metadata.calendarYear}_${metadata.userId}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const pdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, pdfBytes);

  return `output/${filename}`;
}
