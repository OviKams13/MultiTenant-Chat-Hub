import cors from 'cors';
import express from 'express';
import v1Router from './api/v1';
import { errorHandler } from './api/v1/middlewares/errorHandler';
import blockTypeRoutes from './api/v1/routes/blockTypeRoutes';
import dynamicBlockInstanceRoutes from './api/v1/routes/dynamicBlockInstanceRoutes';
import itemTagRoutes from './api/v1/routes/itemTagRoutes';
import publicChatRoutes from './api/v1/routes/publicChatRoutes';
import staticBlockRoutes from './api/v1/routes/staticBlockRoutes';
import { authSwaggerSpec } from './config/swagger';

const SERVICE_NAME = '@mth/backend-service';

// createApp builds the HTTP stack so tests can import app without opening a network port.
// The service keeps one deployable API boundary that includes admin, browse, and public chat routes.
// Health and docs endpoints are mounted at fixed public paths for operations/reviewer discoverability.
// errorHandler is mounted last so all AppError instances are normalized into the API envelope.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: SERVICE_NAME,
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  app.get('/api-docs.json', (_req, res) => {
    res.status(200).json(authSwaggerSpec);
  });

  app.get('/api-docs', (_req, res) => {
    res.status(200).type('html').send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Backend API Docs</title>
        </head>
        <body>
          <h1>Backend OpenAPI Spec</h1>
          <p>This service exposes its OpenAPI document at <code>/api-docs.json</code>.</p>
          <p><a href="/api-docs.json">Open /api-docs.json</a></p>
        </body>
      </html>
    `);
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
