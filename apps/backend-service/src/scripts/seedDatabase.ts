import dotenv from 'dotenv';
import { SeedService } from '../api/v1/services/SeedService';
import { logger } from '../config/Logger';
import { sequelize } from '../config/DatabaseConfig';

dotenv.config();

// Feature 0 exposes no REST endpoints: this script is the official entrypoint for DB bootstrap only.
// Run with: npm run seed
// The script guarantees ADMIN/USER roles, one initial admin account, and required system tags.
// This keeps local, staging, and production environments in a coherent startup state.
async function seedDatabase(): Promise<void> {
  const seedService = new SeedService();

  try {
    // Seed now synchronizes schema first so newly added tables are present in local environments.
    // This avoids ER_NO_SUCH_TABLE errors when running seed against an existing DB that predates new models.
    await sequelize.sync();

    await seedService.runAllSeeds();
    logger.info('Seeds completed successfully.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seed execution failed.', error);
    await sequelize.close();
    process.exit(1);
  }
}

void seedDatabase();
