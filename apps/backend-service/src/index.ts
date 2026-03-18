import dotenv from 'dotenv';
import { SeedService } from './api/v1/services/SeedService';
import { createApp } from './app';
import { sequelize } from './config/DatabaseConfig';

dotenv.config();

export const app = createApp();

const DB_CONNECT_RETRY_ATTEMPTS = Number(process.env.DB_CONNECT_RETRY_ATTEMPTS ?? 10);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 3000);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function connectWithRetry(): Promise<void> {
  for (let attempt = 1; attempt <= DB_CONNECT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await sequelize.authenticate();
      return;
    } catch (error) {
      if (attempt === DB_CONNECT_RETRY_ATTEMPTS) {
        throw error;
      }

      console.warn(
        `⚠️ Database connection attempt ${attempt}/${DB_CONNECT_RETRY_ATTEMPTS} failed. Retrying in ${DB_CONNECT_RETRY_DELAY_MS}ms...`,
      );
      await sleep(DB_CONNECT_RETRY_DELAY_MS);
    }
  }
}

async function applyBootstrapPolicies(): Promise<void> {
  if (process.env.DB_AUTO_SYNC === 'true') {
    console.log('🔧 DB_AUTO_SYNC enabled. Synchronizing Sequelize models...');
    await sequelize.sync();
  }

  if (process.env.DB_AUTO_SEED === 'true') {
    console.log('🌱 DB_AUTO_SEED enabled. Running bootstrap seed service...');
    const seedService = new SeedService();
    await seedService.runAllSeeds();
  }
}

// startServer authenticates DB first so auth endpoints do not run with broken persistence.
export async function startServer(): Promise<void> {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await connectWithRetry();
  await applyBootstrapPolicies();

  app.listen(port, () => {
    console.log(`🚀 Backend service running on http://localhost:${port}`);
    console.log(`🩺 Health check: http://localhost:${port}/health`);
    console.log(`📘 API docs: http://localhost:${port}/api-docs`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error: unknown) => {
    console.error('❌ Unable to bootstrap backend service:', error);
    process.exit(1);
  });
}
