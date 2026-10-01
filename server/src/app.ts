import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import modelRoutes from './routes/model.routes.js';
import departmentRoutes from './routes/department.routes.js';
import serviceRoutes from './routes/service.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import tokenRoutes from './routes/token.routes.js';
import queueRoutes from './routes/queue.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startNoShowJob } from './jobs/noShowJob.js';
import { startReminderJob } from './jobs/reminderJob.js';

let jobsStarted = false;

export function createApp(): Express {
  const app = express();

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite SPA during development and iFrame embedding
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS config
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        return callback(null, true); // Dev-friendly and flexible for preview URLs
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body and cookie parsers
  app.use(express.json());
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'QueueCraft API', timestamp: new Date() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/data-model', modelRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/tokens', tokenRoutes);
  app.use('/api/queue', queueRoutes);

  // 404 handler for unmapped API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `API route ${req.method} ${req.baseUrl} does not exist`,
      },
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  // Initialize background jobs once
  if (!jobsStarted && process.env.NODE_ENV !== 'test') {
    jobsStarted = true;
    startNoShowJob();
    startReminderJob();
  }

  return app;
}

export default createApp;
