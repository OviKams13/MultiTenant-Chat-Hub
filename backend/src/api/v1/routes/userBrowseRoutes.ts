import { Router } from 'express';
import { UserBrowseController } from '../controllers/UserBrowseController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const userBrowseRoutes = Router();

userBrowseRoutes.get('/chatbots', requireAuth, requireRole(['ADMIN', 'USER']), UserBrowseController.listOwnersWithChatbots);
userBrowseRoutes.get('/chatbots/:id', requireAuth, requireRole(['ADMIN', 'USER']), UserBrowseController.getChatbotDetail);

export default userBrowseRoutes;
