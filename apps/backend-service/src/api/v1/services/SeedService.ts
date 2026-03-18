import { sequelize } from '../../../config/DatabaseConfig';
import { logger } from '../../../config/Logger';
import { hashPassword } from '../helpers/password';
import { BbContactModel } from '../models/BbContactModel';
import { BbEntityModel } from '../models/BbEntityModel';
import { ChatbotAllowedOriginModel } from '../models/ChatbotAllowedOriginModel';
import { ChatbotItemModel } from '../models/ChatbotItemModel';
import { ChatbotItemTagModel } from '../models/ChatbotItemTagModel';
import { ChatbotModel } from '../models/ChatbotModel';
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

  private readonly demoChatbotDomain = process.env.SEED_DEMO_CHATBOT_DOMAIN || 'shop.example.com';

  private readonly demoAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ];

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

  private async seedDemoChatbot(adminUser: UserModel): Promise<ChatbotModel> {
    logger.info(`Seeding demo chatbot (${this.demoChatbotDomain})...`);

    const [chatbot] = await ChatbotModel.findOrCreate({
      where: { domain: this.demoChatbotDomain },
      defaults: {
        domain: this.demoChatbotDomain,
        user_id: adminUser.user_id,
        created_by: adminUser.user_id,
        display_name: 'Demo Shop Assistant',
      },
    });

    return chatbot;
  }

  private async seedDemoOriginAllowlist(chatbotId: number): Promise<void> {
    logger.info('Seeding demo chatbot allowed origins...');

    for (const origin of this.demoAllowedOrigins) {
      await ChatbotAllowedOriginModel.findOrCreate({
        where: {
          chatbot_id: chatbotId,
          origin,
        },
        defaults: {
          chatbot_id: chatbotId,
          origin,
        },
      });
    }
  }

  private async seedDemoContactData(chatbotId: number): Promise<void> {
    logger.info('Seeding demo chatbot contact knowledge...');

    let contact = await BbContactModel.findOne({ where: { org_name: 'Demo Shop Inc' } });

    if (!contact) {
      const entity = await BbEntityModel.create({
        entity_type: 'CONTACT',
        type_id: null,
        data: null,
      });

      contact = await BbContactModel.create({
        entity_id: entity.entity_id,
        org_name: 'Demo Shop Inc',
        phone: '+1 555 123 4567',
        email: 'hello@shop.example.com',
        address_text: '100 Demo Avenue',
        city: 'Demo City',
        country: 'Demo Country',
        hours_text: 'Mon-Fri 09:00-17:00',
      });
    } else {
      await contact.update({
        phone: '+1 555 123 4567',
        email: 'hello@shop.example.com',
        address_text: '100 Demo Avenue',
        city: 'Demo City',
        country: 'Demo Country',
        hours_text: 'Mon-Fri 09:00-17:00',
      });
    }

    const [item] = await ChatbotItemModel.findOrCreate({
      where: {
        chatbot_id: chatbotId,
        entity_id: contact.entity_id,
      },
      defaults: {
        chatbot_id: chatbotId,
        entity_id: contact.entity_id,
      },
    });

    const phoneTag = await TagModel.findOne({ where: { tag_code: 'PHONE' } });
    if (!phoneTag) {
      throw new Error('PHONE tag is missing. Run seedSystemTags() before seedDemoContactData().');
    }

    await ChatbotItemTagModel.findOrCreate({
      where: {
        item_id: item.item_id,
        tag_id: phoneTag.tag_id,
      },
      defaults: {
        item_id: item.item_id,
        tag_id: phoneTag.tag_id,
      },
    });
  }

  // runAllSeeds is the single orchestration entrypoint called by the CLI command npm run seed.
  async runAllSeeds(): Promise<void> {
    logger.info('Starting bootstrap seeds (no public API endpoint is created in Feature 0).');
    await sequelize.authenticate();

    await this.seedRoles();
    const admin = await this.seedAdminUser();
    await this.seedSystemTags();

    const demoChatbot = await this.seedDemoChatbot(admin);
    await this.seedDemoOriginAllowlist(demoChatbot.chatbot_id);
    await this.seedDemoContactData(demoChatbot.chatbot_id);

    logger.info('Bootstrap seeds finished successfully.');
  }
}
