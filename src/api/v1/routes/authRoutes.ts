import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middlewares/authMiddleware';

// Auth routes expose owner registration/login and profile retrieval endpoints.
// Feature 1 keeps this router isolated under /api/v1/auth to respect versioned API architecture.
// Public endpoints: register and login; protected endpoint: me.
// Future features can attach rate-limiters or captcha middleware here without touching controllers.
const authRoutes = Router();

authRoutes.post('/register', AuthController.register);
authRoutes.post('/login', AuthController.login);
authRoutes.get('/me', requireAuth, AuthController.me);

export default authRoutes;
