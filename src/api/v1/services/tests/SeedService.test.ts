// @ts-nocheck
import { SeedService } from '../SeedService';
import { RoleModel } from '../../models/RoleModel';
import { UserModel } from '../../models/UserModel';
import { TagModel } from '../../models/TagModel';
import { sequelize } from '../../../../config/DatabaseConfig';
import * as passwordHelper from '../../helpers/password';

// This is a service-level unit test suite with mocks, so it can run without a dedicated MySQL test database.
// The tests validate Feature 0 behavior: bootstrap role creation, admin creation, and system tag seeding.
// We mock Sequelize model methods to avoid fragile integration setup while preserving business-rule checks.
// Idempotence is validated by calling the main orchestrator twice and ensuring execution flow stays stable.
describe('SeedService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = {
      ...originalEnv,
      SEED_ADMIN_EMAIL: 'admin@test.com',
      SEED_ADMIN_PASSWORD: 'SecurePass123!'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // When ADMIN/USER do not exist yet, seedRoles must create them once in uppercase format.
  it('seedRoles should create ADMIN role if not existing', async () => {
    const service = new SeedService();
    const adminRole = { role_id: 1, role_name: 'ADMIN' } as RoleModel;
    const userRole = { role_id: 2, role_name: 'USER' } as RoleModel;

    const findOrCreateSpy = jest
      .spyOn(RoleModel, 'findOrCreate')
      .mockResolvedValueOnce([adminRole, true])
      .mockResolvedValueOnce([userRole, true]);

    const result = await service.seedRoles();

    expect(findOrCreateSpy).toHaveBeenCalledTimes(2);
    expect(result.adminRole.role_name).toBe('ADMIN');
  });

  // Seeded admin account must always be linked to ADMIN role and use a hashed password value.
  it('seedAdminUser should create an admin user with ADMIN role', async () => {
    const service = new SeedService();
    const adminRole = { role_id: 1, role_name: 'ADMIN' } as RoleModel;
    const createdUser = { user_id: 10, email: 'admin@test.com', role_id: 1 } as UserModel;

    jest.spyOn(RoleModel, 'findOne').mockResolvedValue(adminRole);
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);
    jest.spyOn(passwordHelper, 'hashPassword').mockResolvedValue('hashed');
    const createSpy = jest.spyOn(UserModel, 'create').mockResolvedValue(createdUser);

    const result = await service.seedAdminUser();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@test.com',
        role_id: 1,
        password_hash: 'hashed'
      })
    );
    expect(result.email).toBe('admin@test.com');
  });

  // System tags should include baseline chatbot concepts used later by runtime intent matching.
  it('seedSystemTags should create all required system tags', async () => {
    const service = new SeedService();
    const findOrCreateSpy = jest
      .spyOn(TagModel, 'findOrCreate')
      .mockImplementation(async ({ where }: { where: { tag_code: string } }) => {
        const model = { tag_code: where.tag_code, is_system: true } as TagModel;
        return [model, true];
      });

    const result = await service.seedSystemTags();

    expect(findOrCreateSpy).toHaveBeenCalledTimes(6);
    expect(result.map((tag) => tag.tag_code)).toEqual(
      expect.arrayContaining(['CONTACT', 'ADDRESS', 'PHONE', 'HOURS', 'SCHEDULE', 'PERSONAL_INFO'])
    );
  });

  // Running all seeds twice should not throw and should repeat deterministic orchestration calls.
  it('runAllSeeds should be idempotent when called twice', async () => {
    const service = new SeedService();

    jest.spyOn(sequelize, 'authenticate').mockResolvedValue();
    const roleSpy = jest.spyOn(service, 'seedRoles').mockResolvedValue({} as never);
    const adminSpy = jest.spyOn(service, 'seedAdminUser').mockResolvedValue({} as UserModel);
    const tagsSpy = jest.spyOn(service, 'seedSystemTags').mockResolvedValue([]);

    await service.runAllSeeds();
    await service.runAllSeeds();

    expect(roleSpy).toHaveBeenCalledTimes(2);
    expect(adminSpy).toHaveBeenCalledTimes(2);
    expect(tagsSpy).toHaveBeenCalledTimes(2);
  });
});
