import dotenv from 'dotenv';
import { createApp } from './app';
import { sequelize } from './config/DatabaseConfig';

dotenv.config();

export const app = createApp();

// startServer authenticates DB first so auth endpoints do not run with broken persistence.
export async function startServer(): Promise<void> {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await sequelize.authenticate();

  app.listen(port, () => {
    console.log(`🚀 Backend service running on http://localhost:${port}`);
    console.log(`🩺 Health check: http://localhost:${port}/health`);
    console.log(`📘 API docs: http://localhost:${port}/api-docs`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error: unknown) => {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  });
}
