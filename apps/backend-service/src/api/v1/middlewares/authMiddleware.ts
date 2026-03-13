import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../helpers/jwt';
import { AppError } from '../errors/AppError';

// requireAuth protects private routes by enforcing a valid Bearer token.
// It reconstructs the authenticated owner context so controllers can stay free of token parsing logic.
// Any malformed or missing Authorization header returns 401 with a standard error payload.
// Verified claims are attached to req.user for downstream service authorization checks.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    next(new AppError('Authorization token is required', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  (req as Request & { user?: ReturnType<typeof verifyToken> }).user = verifyToken(token);
  next();
}

// requireRole is a reusable authorization layer for upcoming chatbot and admin-only operations.
// The middleware assumes requireAuth has already populated req.user from a verified token.
// If role is missing or unauthorized, we return 403 to indicate authenticated but forbidden access.
// This helper prevents role checks from being duplicated in each controller.
export function requireRole(requiredRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: { role: string } }).user;
    if (!user) {
      next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!requiredRoles.includes(user.role)) {
      next(new AppError('Forbidden', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
}
