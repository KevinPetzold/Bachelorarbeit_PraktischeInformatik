// src/utils/compressImage.js
export async function compressImage(blob, maxSize = 2 * 1024 * 1024) {
  // Lädt ein Blob/File als Image, zeichnet es in Canvas und gibt einen neuen Blob zurück.
  // Versucht, die Qualität so lange zu reduzieren, bis size ≤ maxSize oder Qualität < 0.1.
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Originalmaße beibehalten
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // iterativer Qualitäts-Loop
      (function tryQuality(quality) {
        canvas.toBlob(
          compressedBlob => {
            if (!compressedBlob) {
              reject(new Error('Kompression fehlgeschlagen'));
              return;
            }
            if (compressedBlob.size <= maxSize || quality < 0.1) {
              resolve(compressedBlob);
            } else {
              // Qualität um 0.1 reduzieren und neu versuchen
              tryQuality(quality - 0.1);
            }
          },
          'image/jpeg',
          quality
        );
      })(0.9); // Startqualität = 0.9
    };
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    // Stelle sicher, dass `blob` eine URL ist
    const url = URL.createObjectURL(blob);
    img.src = url;
  });
}