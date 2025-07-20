// src/components/ScanProcessor.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function ScanProcessor({ src, onProcessed, onError }) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(true);
  const workerRef = useRef(null);

  const MIN_WIDTH = 600;
  const MIN_HEIGHT = 800;
  const BLUR_THRESHOLD = 100;
  const MIN_BRIGHTNESS = 40;
  const MAX_BRIGHTNESS = 215;

  // 1) Handler für Nachrichten vom Worker
  const onWorkerMessage = useCallback(
    (ev) => {
      const { blob, error: errMsg } = ev.data;

      if (errMsg) {
        onError(errMsg);
        setBusy(false);
      } else if (blob) {
        const visibleCanvas = canvasRef.current;
        if (!visibleCanvas) {
          onError('Canvas nicht verfügbar.');
          setBusy(false);
          return;
        }
        const vCtx = visibleCanvas.getContext('2d');
        createImageBitmap(blob)
          .then((imageBitmap) => {
            visibleCanvas.width = imageBitmap.width;
            visibleCanvas.height = imageBitmap.height;
            vCtx.drawImage(imageBitmap, 0, 0);
            onProcessed(blob);
            setBusy(false);
          })
          .catch((e) => {
            onError('Fehler beim Zeichnen des Blobs: ' + e.message);
            setBusy(false);
          });
      }
    },
    [onError, onProcessed]
  );

  // 2) Handler für Fehler im Worker
  const onWorkerError = useCallback(
    (ev) => {
      onError('Worker-Fehler: ' + ev.message);
      setBusy(false);
    },
    [onError]
  );

  // 3) useEffect: startet, sobald sich `src` ändert
  useEffect(() => {
    if (!src) return;
    setBusy(true);

    // 3.1) Einen neuen Worker erzeugen, falls noch nicht vorhanden
    if (!workerRef.current) {
      const baseUrl = window.location.origin;
      const code = opencvWorkerCode.replace(
        /%%OPENCV_IMPORT%%/g,
        `importScripts('${baseUrl}/opencv.js');`
      );
      const blob = new Blob([code], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(blobUrl, { type: 'classic' });
    }
    const worker = workerRef.current;

    // 3.2) Listener hinzufügen
    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', onWorkerError);

    // 3.3) Lade das Bild und extrahiere die ImageData
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0);
      const imageData = offCtx.getImageData(0, 0, img.width, img.height);

      // 3.4) Schicke die Daten an den Worker
      worker.postMessage({
        imageData,
        width: img.width,
        height: img.height,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        blurThreshold: BLUR_THRESHOLD,
        minBrightness: MIN_BRIGHTNESS,
        maxBrightness: MAX_BRIGHTNESS,
      });
    };
    img.onerror = () => {
      onError('Bild konnte nicht geladen werden.');
      setBusy(false);
    };
    img.src = src;

    // 3.5) Cleanup: entferne Listener
    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener('message', onWorkerMessage);
        workerRef.current.removeEventListener('error', onWorkerError);
      }
    };
  }, [src, onWorkerMessage, onWorkerError]);

  return (
    <div>
      {busy && <p className="text-gray-600 mb-2">🔍 Kanten erkennen & Qualität prüfen…</p>}
      <canvas ref={canvasRef} className="border rounded" />
    </div>
  );
}

// ---------------------------------------------------------------
// opencvWorkerCode als String (ohne Debug-Logs, aber mit Promise‐Unwrapping)
// ---------------------------------------------------------------
const opencvWorkerCode = `
  let cvReadyResolve;
  const cvReady = new Promise((resolve) => {
    cvReadyResolve = resolve;
  });

  self.Module = {
    onRuntimeInitialized() {
      if (cv && typeof cv.then === 'function') {
  const maybePromise = cv.then((realModule) => {
    cv = realModule;
  });

  // Wenn das zurückgegebene Objekt auch eine catch-Funktion hat, dann nutze sie
  if (maybePromise && typeof maybePromise.catch === 'function') {
    maybePromise.catch(() => {
      cvReadyResolve();
    });
  } else {
    cvReadyResolve(); // Fallback
  }
} else {
  cvReadyResolve();
}
    }
  };

  %%OPENCV_IMPORT%%

  const msgQueue = [];

  cvReady.then(() => {
    for (const data of msgQueue) {
      processMessage(data);
    }
    msgQueue.length = 0;
  });

  self.onmessage = (e) => {
    if (!cv || !cv.Mat) {
      msgQueue.push(e.data);
    } else {
      processMessage(e.data);
    }
  };

  async function processMessage(data) {
    const { imageData, width, height, minWidth, minHeight, blurThreshold, minBrightness, maxBrightness } = data;
    try {
      if (width < minWidth || height < minHeight) {
        throw new Error(\`Bildauflösung zu niedrig: benötigt \${minWidth}×\${minHeight}, hast \${width}×\${height}\`);
      }


      let srcMatBlurTest = new cv.Mat(height, width, cv.CV_8UC4);
      srcMatBlurTest.data.set(imageData.data);

      // Helligkeitstest
      let grayForBrightness = new cv.Mat();
      cv.cvtColor(srcMatBlurTest, grayForBrightness, cv.COLOR_RGBA2GRAY);
      let meanStdDevBrightness = new cv.Mat();
      let stdDevBrightness = new cv.Mat();
      cv.meanStdDev(grayForBrightness, meanStdDevBrightness, stdDevBrightness);
      const meanBrightness = meanStdDevBrightness.doubleAt(0, 0);
      grayForBrightness.delete();
      meanStdDevBrightness.delete();
      stdDevBrightness.delete();

      if (meanBrightness < minBrightness)
        throw new Error('Das Bild ist zu dunkel. Bitte erneut fotografieren.');
      if (meanBrightness > maxBrightness)
        throw new Error('Das Bild ist zu hell. Bitte erneut fotografieren.');

      // Schärfetest
      let grayBlur = new cv.Mat();
      cv.cvtColor(srcMatBlurTest, grayBlur, cv.COLOR_RGBA2GRAY);
      let laplacian = new cv.Mat();
      cv.Laplacian(grayBlur, laplacian, cv.CV_64F);
      let meanStd = new cv.Mat();
      let stdDev = new cv.Mat();
      cv.meanStdDev(laplacian, meanStd, stdDev);
      const variance = stdDev.doubleAt(0, 0) ** 2;
      srcMatBlurTest.delete();
      grayBlur.delete();
      laplacian.delete();
      meanStd.delete();
      stdDev.delete();

      if (variance < blurThreshold) {
        throw new Error('Bild ist unscharf. Bitte erneut scannen.');
      }

      // Kantenerkennung & perspektivischer Zuschnitt
      const srcMat = new cv.Mat(height, width, cv.CV_8UC4);
      srcMat.data.set(imageData.data);
      const gray = new cv.Mat();
      const blurred = new cv.Mat();
      const edges = new cv.Mat();
      cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 75, 200);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      let docCnt = null;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4) {
          if (!docCnt || cv.contourArea(cnt) > cv.contourArea(docCnt)) {
            docCnt = approx;
          }
        }
        cnt.delete();
        if (approx && (!docCnt || docCnt !== approx)) {
          approx.delete();
        }
      }
      if (!docCnt) {
        srcMat.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
        throw new Error('Dokumentenkanten nicht gefunden. Bitte manuell zuschneiden.');
      }

      const pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({ x: docCnt.data32S[i * 2], y: docCnt.data32S[i * 2 + 1] });
      }
      const sum = pts.map(p => p.x + p.y);
      const diff = pts.map(p => p.y - p.x);
      const tl = pts[sum.indexOf(Math.min(...sum))];
      const br = pts[sum.indexOf(Math.max(...sum))];
      const tr = pts[diff.indexOf(Math.min(...diff))];
      const bl = pts[diff.indexOf(Math.max(...diff))];

      const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
      const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const maxW = Math.max(widthA, widthB);
      const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
      const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
      const maxH = Math.max(heightA, heightB);

      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y,
        tr.x, tr.y,
        br.x, br.y,
        bl.x, bl.y,
      ]);
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        maxW - 1, 0,
        maxW - 1, maxH - 1,
        0, maxH - 1,
      ]);

      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      const dstMat = new cv.Mat();
      cv.warpPerspective(srcMat, dstMat, M, new cv.Size(maxW, maxH));

      const offscreen = new OffscreenCanvas(dstMat.cols, dstMat.rows);
      const offCtx = offscreen.getContext('2d');
      const rgba2 = new Uint8ClampedArray(dstMat.data);
      const imageDataCropped2 = new ImageData(rgba2, dstMat.cols, dstMat.rows);
      offCtx.putImageData(imageDataCropped2, 0, 0);

      offscreen
        .convertToBlob({ type: 'image/jpeg', quality: 0.92 })
        .then((blobOut) => {
          self.postMessage({ blob: blobOut });
        })
        .catch((err) => {
          throw new Error('Fehler beim Erzeugen des Blobs: ' + err.message);
        });

      srcMat.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      if (docCnt) docCnt.delete();
      srcTri.delete();
      dstTri.delete();
      M.delete();
      dstMat.delete();
    } catch (err) {
      self.postMessage({ error: err.message });
    }
  }
`;