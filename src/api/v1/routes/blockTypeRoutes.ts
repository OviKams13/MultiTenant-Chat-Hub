import { Router } from 'express';
import { BlockTypeController } from '../controllers/BlockTypeController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

// Block type routes are mounted under /api/v1/chatbots for tenant-scoped template management.
// All endpoints are private ADMIN APIs because they shape chatbot runtime data contracts.
// Global system types are readable but modification/deletion remains restricted in service logic.
// Route handlers stay thin and delegate validation/business checks to controller/service layers.
const blockTypeRoutes = Router();

blockTypeRoutes.post('/:chatbotId/block-types', requireAuth, requireRole(['ADMIN']), BlockTypeController.createBlockType);
blockTypeRoutes.get('/:chatbotId/block-types', requireAuth, requireRole(['ADMIN']), BlockTypeController.listBlockTypes);
blockTypeRoutes.get('/:chatbotId/block-types/:typeId', requireAuth, requireRole(['ADMIN']), BlockTypeController.getBlockType);
blockTypeRoutes.put('/:chatbotId/block-types/:typeId', requireAuth, requireRole(['ADMIN']), BlockTypeController.updateBlockType);
blockTypeRoutes.delete('/:chatbotId/block-types/:typeId', requireAuth, requireRole(['ADMIN']), BlockTypeController.deleteBlockType);

export default blockTypeRoutes;
