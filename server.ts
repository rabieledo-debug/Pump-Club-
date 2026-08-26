import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase, CUSTOMER_IMAGES_DIR, COACH_IMAGES_DIR } from './server/db.js';
import { router as apiRouter } from './server/routes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite database
  await initDatabase();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded images statically
  app.use('/uploads/customer-images', express.static(CUSTOMER_IMAGES_DIR));
  app.use('/uploads/coach-images', express.static(COACH_IMAGES_DIR));

  // Mount API routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Pump Club', version: '1.0.0', local_sqlite: true });
  });

  // Explicit JSON response for any unhandled /api route
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `المسار غير موجود (${req.method} ${req.originalUrl})` });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
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
