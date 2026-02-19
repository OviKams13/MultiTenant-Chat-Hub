import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { validateLogin, validateRegister } from '../validations/authValidation';
import { AppError } from '../errors/AppError';

const authService = new AuthService();

// AuthController keeps request/response orchestration minimal and delegates business rules to AuthService.
// Each handler validates input, calls service logic, and returns standardized API payloads.
// Errors are forwarded to the global error handler so status-code mapping stays centralized.
// This thin-controller style makes the module easier to test and maintain as auth grows.
export const AuthController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = validateRegister(req.body as Record<string, unknown>);
      const result = await authService.registerAdmin(payload);

      res.status(201).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = validateLogin(req.body as Record<string, unknown>);
      const result = await authService.login(payload);

      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedUser = (req as Request & { user?: { userId: number } }).user;
      if (!authenticatedUser) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const user = await authService.getAuthenticatedUser(authenticatedUser.userId);
      res.status(200).json({
        success: true,
        data: user,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
};
