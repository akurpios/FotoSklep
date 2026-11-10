import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, UPLOADS_DIR } from './db';
import projectsRouter from './routes/projects';
import galleryRouter from './routes/gallery';
import settingsRouter from './routes/settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4838;

// Security: Hide Express fingerprint
app.disable('x-powered-by');

// Security: Helmet HTTP security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let Vite client load its bundled assets smoothly
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows image loading from /uploads
    crossOriginEmbedderPolicy: false,
  })
);

// Security: CORS configuration
app.use(
  cors({
    origin: true, // Reflect request origin
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Security: Rate limiting to protect against DoS
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // 1500 requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', globalApiLimiter);

// Security: Strict rate limiter on PIN verification to stop brute-forcing
const pinBruteForceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 verification attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PIN verification attempts. Please wait 15 minutes before trying again.' },
});
app.use('/api/gallery/:slug/verify', pinBruteForceLimiter);

// Parsers with reasonable body limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded photos directly with cache headers & secure static options
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '7d',
    immutable: true,
    dotfiles: 'ignore',
    index: false,
  })
);

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend in production
const clientDistPath = fs.existsSync(path.resolve(__dirname, '../client'))
  ? path.resolve(__dirname, '../client')
  : path.resolve(process.cwd(), 'dist/client');

if (fs.existsSync(clientDistPath)) {
  app.use(
    express.static(clientDistPath, {
      dotfiles: 'ignore',
      index: 'index.html',
    })
  );
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.warn(`[FotoSklep Server] Client build not found at ${clientDistPath}`);
}

// Global error handler: never leak internal stack traces to users
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal error occurred',
  });
});

const server = app.listen(PORT, () => {
  console.log(`[FotoSklep Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[FotoSklep Server] Uploads directory: ${UPLOADS_DIR}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n[FotoSklep Server] Shutting down gracefully...');
  server.close(() => {
    try {
      db.close();
      console.log('[FotoSklep Server] Database connection closed.');
    } catch (e) {
      console.warn('[FotoSklep Server] Error closing database:', e);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
