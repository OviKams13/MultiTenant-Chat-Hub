import { AppError } from '../errors/AppError';
import { signToken } from '../helpers/jwt';
import { comparePassword, hashPassword } from '../helpers/password';
import { RoleModel } from '../models/RoleModel';
import { UserModel } from '../models/UserModel';

interface AuthInput {
  email: string;
  password: string;
}

interface UserDTO {
  id: number;
  email: string;
  role: string;
  createdAt: Date;
}

interface AuthResult {
  user: UserDTO;
  token: string;
}

// AuthService contains all account authentication business rules for admin/owner users.
// Controllers only call these methods so database and cryptographic concerns remain centralized.
// Every method returns DTOs without password hashes to prevent accidental credential exposure.
// This service depends on Role/User models already prepared by Feature 0 bootstrap.
export class AuthService {
  // registerAdmin creates a new owner account and immediately returns a JWT session token.
  async registerAdmin(payload: AuthInput): Promise<AuthResult> {
    const existingUser = await UserModel.findOne({ where: { email: payload.email } });
    if (existingUser) {
      throw new AppError('Email already in use', 409, 'EMAIL_ALREADY_IN_USE');
    }

    const adminRole = await RoleModel.findOne({ where: { role_name: 'ADMIN' } });
    if (!adminRole) {
      throw new AppError('ADMIN role is missing. Run seed first.', 500, 'ADMIN_ROLE_MISSING');
    }

    const passwordHash = await hashPassword(payload.password);
    const createdUser = await UserModel.create({
      role_id: adminRole.role_id,
      email: payload.email,
      password_hash: passwordHash
    });

    const userDto = this.toUserDto(createdUser, adminRole.role_name);
    const token = signToken({ userId: userDto.id, email: userDto.email, role: userDto.role });

    return { user: userDto, token };
  }

  // login verifies credentials and emits a fresh JWT used by protected endpoints like /auth/me.
  async login(payload: AuthInput): Promise<AuthResult> {
    const user = await UserModel.findOne({
      where: { email: payload.email },
      include: [{ model: RoleModel, as: 'role' }]
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await comparePassword(payload.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const roleName = (user.get('role') as RoleModel | undefined)?.role_name;
    if (!roleName) {
      throw new AppError('Role mapping missing for user', 500, 'ROLE_MAPPING_MISSING');
    }

    const userDto = this.toUserDto(user, roleName);
    const token = signToken({ userId: userDto.id, email: userDto.email, role: userDto.role });

    return { user: userDto, token };
  }

  // getAuthenticatedUser reloads the canonical user profile to avoid trusting stale JWT claims.
  async getAuthenticatedUser(userId: number): Promise<UserDTO> {
    const user = await UserModel.findByPk(userId, {
      include: [{ model: RoleModel, as: 'role' }]
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const roleName = (user.get('role') as RoleModel | undefined)?.role_name;
    if (!roleName) {
      throw new AppError('Role mapping missing for user', 500, 'ROLE_MAPPING_MISSING');
    }

    return this.toUserDto(user, roleName);
  }

  // Private mapper enforces stable API DTO field names independent from database column naming.
  private toUserDto(user: UserModel, roleName: string): UserDTO {
    return {
      id: user.user_id,
      email: user.email,
      role: roleName,
      createdAt: user.created_at as Date
    };
  }
}
