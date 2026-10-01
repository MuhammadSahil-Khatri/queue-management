import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const app = createApp();

async function start() {
  try {
    // Ensure seed data is ready
    if ((prisma as any).seed) {
      await (prisma as any).seed();
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 QueueCraft Auth & API Server running on http://0.0.0.0:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
