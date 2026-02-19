import { AuthTokenPayload } from '../api/v1/helpers/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
