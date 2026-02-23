import { AppError } from '../errors/AppError';
import { signToken } from '../helpers/jwt';
import { comparePassword, hashPassword } from '../helpers/password';
import { RoleModel } from '../models/RoleModel';
import { UserModel } from '../models/UserModel';

interface AuthInput {
  email: string;
  password: string;
}

interface RegisterInput extends AuthInput {
  role: 'ADMIN' | 'USER';
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

export class AuthService {
  async register(payload: RegisterInput): Promise<AuthResult> {
    const existingUser = await UserModel.findOne({ where: { email: payload.email } });
    if (existingUser) {
      throw new AppError('Email already in use', 409, 'EMAIL_ALREADY_IN_USE');
    }

    const role = await RoleModel.findOne({ where: { role_name: payload.role } });
    if (!role) {
      throw new AppError(`${payload.role} role is missing. Run seed first.`, 500, `${payload.role}_ROLE_MISSING`);
    }

    const passwordHash = await hashPassword(payload.password);
    const createdUser = await UserModel.create({
      role_id: role.role_id,
      email: payload.email,
      password_hash: passwordHash
    });

    const userDto = this.toUserDto(createdUser, role.role_name);
    const token = signToken({ userId: userDto.id, email: userDto.email, role: userDto.role });

    return { user: userDto, token };
  }

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

  private toUserDto(user: UserModel, roleName: string): UserDTO {
    return {
      id: user.user_id,
      email: user.email,
      role: roleName,
      createdAt: user.created_at as Date
    };
  }
}
