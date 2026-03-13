import { sequelize } from '../../../config/DatabaseConfig';
import { logger } from '../../../config/Logger';
import { hashPassword } from '../helpers/password';
import { RoleModel } from '../models/RoleModel';
import { TagModel } from '../models/TagModel';
import { UserModel } from '../models/UserModel';

interface SystemTagSeed {
  tag_code: string;
  description: string;
  category: string;
  synonyms_json: string[];
}

// SeedService is a backend bootstrap service; it does not expose any public HTTP endpoint.
// It guarantees minimal data integrity so future auth and chatbot features start from a known state.
// The service is intentionally idempotent: rerunning seeds should update/create without duplicates.
export class SeedService {
  // These defaults keep local development usable, but production should provide environment variables.
  private readonly adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  private readonly adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  // System tags represent foundational concepts used by chatbot runtime and admin-managed business data.
  private readonly systemTags: SystemTagSeed[] = [
    {
      tag_code: 'CONTACT',
      description: 'Generic contact details provided by a business',
      category: 'CONTACT',
      synonyms_json: ['contact', 'contact info', 'coordonnées']
    },
    {
      tag_code: 'ADDRESS',
      description: 'Business address and location information',
      category: 'CONTACT',
      synonyms_json: ['adresse', 'address', 'location', 'où êtes-vous']
    },
    {
      tag_code: 'PHONE',
      description: 'Phone numbers and call-related information',
      category: 'CONTACT',
      synonyms_json: ['phone', 'téléphone', 'numéro']
    },
    {
      tag_code: 'HOURS',
      description: 'Opening and closing hours for normal business days',
      category: 'SCHEDULE',
      synonyms_json: ['opening hours', 'horaire', "heures d'ouverture", 'open', 'close']
    },
    {
      tag_code: 'SCHEDULE',
      description: 'Appointments, schedules, and planning details',
      category: 'SCHEDULE',
      synonyms_json: ['planning', 'agenda', 'schedule', 'rendez-vous']
    },
    {
      tag_code: 'PERSONAL_INFO',
      description: 'Personal profile details needed by business workflows',
      category: 'SYSTEM',
      synonyms_json: ['personal info', 'profil', 'identity']
    }
  ];

  // seedRoles creates mandatory role catalog entries consumed by the initial admin account.
  async seedRoles(): Promise<{ adminRole: RoleModel; userRole: RoleModel }> {
    logger.info('Seeding roles...');

    const [adminRole] = await RoleModel.findOrCreate({
      where: { role_name: 'ADMIN' },
      defaults: { role_name: 'ADMIN', description: 'System administrator/owner' }
    });

    const [userRole] = await RoleModel.findOrCreate({
      where: { role_name: 'USER' },
      defaults: { role_name: 'USER', description: 'Regular user' }
    });

    return { adminRole, userRole };
  }

  // seedAdminUser creates a single bootstrap admin account and links it to ADMIN role.
  async seedAdminUser(): Promise<UserModel> {
    logger.info('Seeding admin user...');

    if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
      logger.warn('SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is missing; fallback defaults are being used.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.adminEmail)) {
      throw new Error('SEED_ADMIN_EMAIL is invalid. Expected a valid email format.');
    }

    const adminRole = await RoleModel.findOne({ where: { role_name: 'ADMIN' } });
    if (!adminRole) {
      throw new Error('ADMIN role is missing. Run seedRoles() before seeding admin user.');
    }

    const existingAdmin = await UserModel.findOne({ where: { email: this.adminEmail } });
    if (existingAdmin) {
      logger.info(`Admin user already exists for email ${this.adminEmail}.`);
      return existingAdmin;
    }

    const password_hash = await hashPassword(this.adminPassword);
    return UserModel.create({
      role_id: adminRole.role_id,
      email: this.adminEmail,
      password_hash
    });
  }

  // seedSystemTags inserts the baseline system taxonomy used by the chatbot runtime and admin UI.
  async seedSystemTags(): Promise<TagModel[]> {
    logger.info('Seeding system tags...');

    const results: TagModel[] = [];
    for (const tag of this.systemTags) {
      const upperTagCode = tag.tag_code.trim().toUpperCase();
      const [record] = await TagModel.findOrCreate({
        where: { tag_code: upperTagCode },
        defaults: {
          ...tag,
          tag_code: upperTagCode,
          is_system: true
        }
      });

      results.push(record);
    }

    return results;
  }

  // runAllSeeds is the single orchestration entrypoint called by the CLI command npm run seed.
  async runAllSeeds(): Promise<void> {
    logger.info('Starting bootstrap seeds (no public API endpoint is created in Feature 0).');
    await sequelize.authenticate();

    await this.seedRoles();
    await this.seedAdminUser();
    await this.seedSystemTags();

    logger.info('Bootstrap seeds finished successfully.');
  }
}
