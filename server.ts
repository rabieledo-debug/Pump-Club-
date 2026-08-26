import express from 'express';
import path from 'path';
import { initDatabase, CUSTOMER_IMAGES_DIR, COACH_IMAGES_DIR } from './server/db.js';
import { router as apiRouter } from './server/routes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite database
  await initDatabase();

  // CORS middleware for cross-origin and multi-device access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve uploaded images statically
  app.use('/uploads/customer-images', express.static(CUSTOMER_IMAGES_DIR));
  app.use('/uploads/coach-images', express.static(COACH_IMAGES_DIR));

  // Health checks
  app.get(['/api/health', '/health'], (req, res) => {
    res.json({ status: 'ok', app: 'Pump Club', version: '1.0.0', local_sqlite: true, time: new Date().toISOString() });
  });

  // Mount API routes under /api
  app.use('/api', apiRouter);

  // Catch-all for unhandled /api/* routes to guarantee a structured JSON 404
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `مسار الـ API غير موجود (${req.method} ${req.originalUrl})` });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`  PUMP CLUB - Gym Management System`);
    console.log(`  Local SQLite Server running on port ${PORT}`);
    console.log(`=========================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

