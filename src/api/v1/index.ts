import { Router } from 'express';
import authRoutes from './routes/authRoutes';

// API v1 router groups all versioned modules and keeps entrypoint composition readable.
// Only auth is mounted for now, but this file is the extension point for chatbot/block routes.
// Grouping modules here avoids route mounting duplication in src/index.ts over time.
// Prefixing remains explicit and stable: /api/v1/auth.
const v1Router = Router();

v1Router.use('/auth', authRoutes);

export default v1Router;
