// /backend/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateJWT } from './services/authService.js';
import dotenv from 'dotenv';
import { initDB } from './data/db.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import processRoutes from './routes/process.js';
import sendRoutes    from './routes/send.js';

await initDB();
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 1) CORS für alle API-Routen
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

// 2) Helmet mit neuem Resource-Policy-Header
app.use(
  helmet({
    // verhindert, dass static assets nur same-origin laufen
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 3) Statische Ordner, mit explizitem CORS-Header
app.use(
  '/processed',
  // Access-Control-Allow-Origin, falls jemand direkt auf URL greift
  cors({ origin: 'http://localhost:3000' }),
  express.static(path.join(__dirname, 'processed'))
);
app.use(
  '/uploads',
  cors({ origin: 'http://localhost:3000' }),
  express.static(path.join(__dirname, 'uploads'))
);
app.use(
  '/output',
  cors({ origin: 'http://localhost:3000' }),
  express.static(path.join(__dirname, 'output'))
);


// 3) Auth-Routen (unprotected)
app.use('/api/auth', authRoutes);

// 4) Geschützte Routen – nur mit gültigem JWT
//    Upload, Process und Send dürfen nur angemeldete Nutzer aufrufen:
app.use('/api/upload', authenticateJWT, uploadRoutes);
app.use('/api/process', authenticateJWT, processRoutes);
app.use('/api/send', authenticateJWT, sendRoutes);

// 5) Globaler Error-Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, '0.0.0.0',() => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});