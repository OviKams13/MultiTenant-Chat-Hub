// @ts-nocheck
import { AuthService } from '../AuthService';
import { UserModel } from '../../models/UserModel';
import { RoleModel } from '../../models/RoleModel';
import * as passwordHelper from '../../helpers/password';
import * as jwtHelper from '../../helpers/jwt';

// AuthService unit tests mock Sequelize and helpers to isolate business rules.
// We verify register flow constraints, login credential checks, and profile retrieval behavior.
// This suite ensures role mapping and standardized AppError codes remain stable for API clients.
// Tests remain deterministic because no real database or JWT secret is required here.
describe('AuthService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('registerAdmin should create a user when email is available', async () => {
    const service = new AuthService();

    jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);
    jest.spyOn(RoleModel, 'findOne').mockResolvedValue({ role_id: 1, role_name: 'ADMIN' } as RoleModel);
    jest.spyOn(passwordHelper, 'hashPassword').mockResolvedValue('hashed-value');
    jest.spyOn(UserModel, 'create').mockResolvedValue({
      user_id: 10,
      email: 'owner@example.com',
      created_at: new Date('2026-01-01T00:00:00.000Z')
    } as UserModel);
    jest.spyOn(jwtHelper, 'signToken').mockReturnValue('signed-jwt');

    const result = await service.registerAdmin({ email: 'owner@example.com', password: 'StrongPass123!' });

    expect(result.user.email).toBe('owner@example.com');
    expect(result.user.role).toBe('ADMIN');
    expect(result.token).toBe('signed-jwt');
  });

  it('registerAdmin should fail when email already exists', async () => {
    const service = new AuthService();

    jest.spyOn(UserModel, 'findOne').mockResolvedValue({ user_id: 2 } as UserModel);

    await expect(service.registerAdmin({ email: 'owner@example.com', password: 'StrongPass123!' })).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_IN_USE'
    });
  });

  it('login should fail for unknown email', async () => {
    const service = new AuthService();

    jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);

    await expect(service.login({ email: 'missing@example.com', password: 'StrongPass123!' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS'
    });
  });

  it('login should fail when password is invalid', async () => {
    const service = new AuthService();

    jest.spyOn(UserModel, 'findOne').mockResolvedValue({
      password_hash: 'hash',
      get: () => ({ role_name: 'ADMIN' })
    } as unknown as UserModel);
    jest.spyOn(passwordHelper, 'comparePassword').mockResolvedValue(false);

    await expect(service.login({ email: 'owner@example.com', password: 'bad-pass' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS'
    });
  });

  it('getAuthenticatedUser should throw when user is missing', async () => {
    const service = new AuthService();

    jest.spyOn(UserModel, 'findByPk').mockResolvedValue(null);

    await expect(service.getAuthenticatedUser(42)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND'
    });
  });
});
