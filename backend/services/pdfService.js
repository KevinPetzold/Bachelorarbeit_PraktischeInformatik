// /backend/services/pdfService.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generatePDF = ({ images, texts = [], metadata = {} }) => {
  return new Promise((resolve, reject) => {
    try {
      // === 1) Output-Verzeichnis sicherstellen ===
      const outputDir = path.join(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // === 2) Dateinamen generieren anhand Metadaten ===
      const filename = `${metadata.budgetId}_${metadata.invoiceNumber}_${metadata.calendarYear}_${metadata.userId}.pdf`;
      const outputPath = path.join(outputDir, filename);

      // === 3) PDFKit-Dokument anlegen, Seite für Seite ===
      const doc = new PDFDocument({ autoFirstPage: false });
      // PDF-Metadata setzen
      doc.info.Title = `Rechnung ${metadata.invoiceNumber}`;
      doc.info.Author = `User ${metadata.userId}`;
      doc.info.Subject = `Budget ${metadata.budgetId} (${metadata.year})`;
      doc.info.Keywords = `BudgetID:${metadata.budgetId},Nummer:${metadata.invoiceNumber},Year:${metadata.calendarYear},UserID:${metadata.userId}`;

      // Optional: Verschlüsselung aktivieren (sofern PDFKit-Version unterstützt)
      if (process.env.PDF_ENCRYPTION === 'true') {
        doc.encrypt({
          userPassword: metadata.userId,
          ownerPassword: process.env.PDF_OWNER_PASSWORD,
          userProtectionFlag: 4 // z.B. Nur Lesen erlaubt
        });
      }

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // === 4) Jede Seite: Bild + Transparenter OCR-Text ===
      images.forEach((imageRelPath, idx) => {
        const fullImagePath = path.join(process.cwd(), imageRelPath);
        if (!fs.existsSync(fullImagePath)) {
          throw new Error(`Image not found: ${imageRelPath}`);
        }
        // Seite in Bildgröße
        const imgObj = doc.openImage(fullImagePath);
        const pageOpts = { size: [imgObj.width, imgObj.height], margin: 0 };
        doc.addPage(pageOpts);
        // 4.1) Bild rendern
        doc.image(fullImagePath, 0, 0, { width: imgObj.width, height: imgObj.height });
        // 4.2) Unsichtbaren OCR-Text darüberlegen
        const text = texts[idx];
        doc.font('Helvetica').fontSize(10);
        doc.fillColor('black', 0); // 0 = komplett transparent
        // Schreibe den gesamten Text in einem großen Textfeld, das das Bild abdeckt
        doc.text(text, 0, 0, {
          width: imgObj.width,
          height: imgObj.height,
          lineBreak: false,
          ellipsis: false,
        });
        // Danach wieder „sichtbar“ setzen, falls später etwas sichtbar benötigt wird:
        doc.fillColor('black', 1);
      });

      // === 5) (Optional) Noch eine Übersichtsseite hintendran ===
      if (metadata.appendSummaryPage) {
        doc.addPage({ size: 'A4', margin: 40 });
        doc.fontSize(14).fillColor('black').text('Rechnungsübersicht', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Budget ID: ${metadata.budgetId}`);
        doc.text(`Rechnungs-Nr.: ${metadata.invoiceNumber}`);
        doc.text(`Jahr: ${metadata.year}`);
        doc.text(`User: ${metadata.userId}`);
      }

      // === 6) PDF beenden und Pfad zurückliefern ===
      doc.end();
      stream.on('finish', () => resolve(`output/${filename}`));
      stream.on('error', err => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};