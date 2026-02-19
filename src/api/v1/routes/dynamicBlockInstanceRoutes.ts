import { Router } from 'express';
import { DynamicBlockInstanceController } from '../controllers/DynamicBlockInstanceController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

// Dynamic block routes live under /blocks/dynamic to avoid collisions with static contact/schedule routes.
// All endpoints are private ADMIN operations because they mutate tenant-owned chatbot content.
// Controllers are invoked only after JWT validation and role checks complete successfully.
// This route contract provides full CRUD for one dynamic type inside one chatbot scope.
const dynamicBlockInstanceRoutes = Router();

dynamicBlockInstanceRoutes.post(
  '/:chatbotId/blocks/dynamic/:typeId',
  requireAuth,
  requireRole(['ADMIN']),
  DynamicBlockInstanceController.createInstance
);
dynamicBlockInstanceRoutes.get(
  '/:chatbotId/blocks/dynamic/:typeId',
  requireAuth,
  requireRole(['ADMIN']),
  DynamicBlockInstanceController.listInstances
);
dynamicBlockInstanceRoutes.get(
  '/:chatbotId/blocks/dynamic/:typeId/:entityId',
  requireAuth,
  requireRole(['ADMIN']),
  DynamicBlockInstanceController.getInstance
);
dynamicBlockInstanceRoutes.put(
  '/:chatbotId/blocks/dynamic/:typeId/:entityId',
  requireAuth,
  requireRole(['ADMIN']),
  DynamicBlockInstanceController.updateInstance
);
dynamicBlockInstanceRoutes.delete(
  '/:chatbotId/blocks/dynamic/:typeId/:entityId',
  requireAuth,
  requireRole(['ADMIN']),
  DynamicBlockInstanceController.deleteInstance
);

export default dynamicBlockInstanceRoutes;
