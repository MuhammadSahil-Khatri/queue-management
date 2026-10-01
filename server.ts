import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/src/app.ts';
import { prisma } from './server/src/lib/prisma.ts';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  const app = createApp();

  // In development, mount Vite SPA middleware so port 3000 serves both Express /api and React client
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  // Ensure demo seed data is initialized
  if ((prisma as any).seed) {
    await (prisma as any).seed();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 QueueCraft Full-Stack Server active on http://0.0.0.0:${PORT}`);
    console.log(`   API Endpoint: http://localhost:${PORT}/api`);
    console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
