import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import v1Router from './api/v1';
import staticBlockRoutes from './api/v1/routes/staticBlockRoutes';
import blockTypeRoutes from './api/v1/routes/blockTypeRoutes';
import itemTagRoutes from './api/v1/routes/itemTagRoutes';
import dynamicBlockInstanceRoutes from './api/v1/routes/dynamicBlockInstanceRoutes';
import publicChatRoutes from './api/v1/routes/publicChatRoutes';
import { errorHandler } from './api/v1/middlewares/errorHandler';
import { sequelize } from './config/DatabaseConfig';

dotenv.config();

// createApp builds the HTTP stack so tests can import app without opening a network port.
// Feature 1 mounts auth endpoints under /api/v1/auth to align with versioned backend architecture.
// A health route remains available for simple uptime checks in local and deployment environments.
// errorHandler must be mounted last to normalize all thrown AppError instances.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
  });

  app.use('/api/v1', v1Router);
  app.use('/api/v1/chatbots', staticBlockRoutes);
  app.use('/api/v1/chatbots', blockTypeRoutes);
  app.use('/api/v1/chatbots', itemTagRoutes);
  app.use('/api/v1/chatbots', dynamicBlockInstanceRoutes);
  // Public runtime chat stays outside /chatbots so visitors can call it without admin routing overlap.
  app.use('/api/v1', publicChatRoutes);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

// startServer authenticates DB first so auth endpoints do not run with broken persistence.
export async function startServer(): Promise<void> {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await sequelize.authenticate();

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error: unknown) => {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  });
}
