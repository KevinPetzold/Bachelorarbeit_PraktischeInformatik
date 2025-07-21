// /backend/services/pdfService.js
import fs from 'fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';

// images = Array von Dateipfaden (JPEG/PNG oder PDF)
// texts = OCR-Texte (Array, leere Felder/Kein OCR für PDFs)

export async function generatePDF({ images, texts = [], metadata = {} }) {
  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < images.length; i++) {
    const filePath = images[i];
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      const pdfBytes = await fs.readFile(filePath);
      const srcPdf = await PDFDocument.load(pdfBytes);
      const srcPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      srcPages.forEach(p => mergedPdf.addPage(p));
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

const scale = Math.min(
  A4_WIDTH / dims.width,
  A4_HEIGHT / dims.height,
  1
);

const scaledWidth = dims.width * scale;
const scaledHeight = dims.height * scale;

const x = (A4_WIDTH - scaledWidth) / 2;
const y = (A4_HEIGHT - scaledHeight) / 2;

const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);

page.drawImage(imgEmbed, {
  x,
  y,
  width: scaledWidth,
  height: scaledHeight,
});

      const text = texts[i];
      if (text && !/kein\s*ocr/i.test(text)) {
        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        page.drawText(text, {
          x: 5, y: dims.height - 20,
          size: 10,
          color: rgb(0, 0, 0),
          opacity: 0,
          font,
          maxWidth: dims.width - 10,
        });
      }
    }
  }

  if (metadata) {
    mergedPdf.setTitle(`Rechnung ${metadata.invoiceNumber || ''}`);
    mergedPdf.setSubject(`Budget: ${metadata.budgetId || ''} (${metadata.year || ''})`);
    mergedPdf.setKeywords([metadata.budgetId, metadata.invoiceNumber, metadata.userId].filter(Boolean));
    mergedPdf.setAuthor(`NutzerID: ${metadata.userId || ''}`);
  }

  const outputDir = path.join(process.cwd(), 'output');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${metadata.budgetId}_${metadata.invoiceNumber}_${metadata.calendarYear}_${metadata.userId}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const pdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, pdfBytes);

  return `output/${filename}`;
}
