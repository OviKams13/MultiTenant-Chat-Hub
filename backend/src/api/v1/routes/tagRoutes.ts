import { Router } from 'express';
import { TagController } from '../controllers/TagController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

// Tag routes are private because tags drive builder behavior and should be admin-governed.
// Both list and create endpoints require a valid JWT and ADMIN role authorization.
// This route module intentionally stays thin and delegates all business logic downstream.
// Future tag endpoints (update/delete) can be added here without touching app bootstrap wiring.
const tagRoutes = Router();

tagRoutes.get('/', requireAuth, requireRole(['ADMIN']), TagController.getTags);
tagRoutes.post('/', requireAuth, requireRole(['ADMIN']), TagController.createTag);

export default tagRoutes;
