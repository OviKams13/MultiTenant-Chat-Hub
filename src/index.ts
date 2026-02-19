import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/DatabaseConfig';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

async function startServer() {
  try {
    // Test connexion DB
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
