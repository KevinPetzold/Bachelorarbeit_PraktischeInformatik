// src/components/DocumentEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line } from 'react-konva';
import useImage from 'use-image';
import { Button } from './Button';

export default function DocumentEditor({ src, initialCorners, onConfirm, onCancel }) {
  const [image] = useImage(src);
  const [corners, setCorners] = useState(initialCorners || []);
  const stageRef = useRef();

  const MAX_DISPLAY_WIDTH = 450;
  const MAX_DISPLAY_HEIGHT = 1000;

const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

useEffect(() => {
  const handleResize = () => setViewportWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

  // Wenn initialCorners sich ändert, übernehmen
  useEffect(() => {
    if (initialCorners) {
      setCorners(initialCorners);
    }
  }, [initialCorners]);

  // Wenn initialCorners nicht gesetzt oder nicht 4 Punkte, nichts rendern
  if (!initialCorners || initialCorners.length !== 4) {
    return <p>🔄 Warte auf Eckpunkte zum manuellen Zuschnitt …</p>;
  }

  const handleDrag = (e, idx) => {
    const { x, y } = e.target.position();
    setCorners(c => c.map((pt, i) => (i === idx ? { x, y } : pt)));
  };

  const handleOK = () => {
    // Eckpunkt‐Koordinaten extrahieren
    const xs = corners.map(p => p.x),
          ys = corners.map(p => p.y);
    const minX = Math.min(...xs),
          maxX = Math.max(...xs),
          minY = Math.min(...ys),
          maxY = Math.max(...ys);
    const w = maxX - minX,
          h = maxY - minY;

    // Offscreen‐Canvas erstellen
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');

    const imgEl = new window.Image();
    imgEl.crossOrigin = 'anonymous';
    imgEl.onload = () => {
      // Einfache Achsen‐ausgerichtete Zuschneidung
      ctx.drawImage(imgEl, minX, minY, w, h, 0, 0, w, h);
      off.toBlob(blob => {
        if (blob && typeof onConfirm === 'function') {
          onConfirm(blob);
        }
      }, 'image/jpeg');
    };
    imgEl.src = src;
  };

  // Sobald das Bild geladen ist, baut Konva das Stage/Layout
  if (!image) {
    return <p>🔄 Bild wird geladen …</p>;
  }

  const points = corners.flatMap(p => [p.x, p.y]);
    const scaleFactor = Math.min( (viewportWidth-200) / image.width, 700/image.width,
  1 // nie größer skalieren
  );

  return (
    <>
      <Stage
  width={image.width * scaleFactor}
  height={image.height * scaleFactor}
  ref={stageRef}
  style={{ border: '1px solid #ccc', margin: 'auto' }}
  scale={{ x: scaleFactor, y: scaleFactor }}
>

        <Layer>
          <KonvaImage image={image} />
          <Line points={points} closed stroke="yellow" strokeWidth={20} />
          {corners.map((pt, i) => (
            <Circle
              key={i}
              x={pt.x}
              y={pt.y}
              radius={20}
              fill="red"
              stroke="white"
              strokeWidth={4}
              hitStrokeWidth={200}
              draggable
              onDragMove={e => handleDrag(e, i)}
            />
          ))}
        </Layer>
      </Stage>

      <div className="mt-4 flex justify-center gap-4">
        <Button onClick={handleOK}>Bestätigen</Button>
        <Button variant="secondary" onClick={onCancel}>Abbrechen</Button>
      </div>
    </>
  );
}