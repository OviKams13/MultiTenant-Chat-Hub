import { Router } from 'express';
import { ChatbotAllowedOriginController } from '../controllers/ChatbotAllowedOriginController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const chatbotAllowedOriginRoutes = Router();

chatbotAllowedOriginRoutes.get(
  '/:chatbotId/allowed-origins',
  requireAuth,
  requireRole(['ADMIN']),
  ChatbotAllowedOriginController.listAllowedOrigins,
);

chatbotAllowedOriginRoutes.post(
  '/:chatbotId/allowed-origins',
  requireAuth,
  requireRole(['ADMIN']),
  ChatbotAllowedOriginController.createAllowedOrigin,
);

chatbotAllowedOriginRoutes.delete(
  '/:chatbotId/allowed-origins/:allowedOriginId',
  requireAuth,
  requireRole(['ADMIN']),
  ChatbotAllowedOriginController.deleteAllowedOrigin,
);

export default chatbotAllowedOriginRoutes;
