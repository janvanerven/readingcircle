import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { seedAdmin } from './services/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { bookRoutes } from './routes/books';
import { meetRoutes } from './routes/meets';
import { invitationRoutes } from './routes/invitations';
import { errorHandler } from './middleware/error';
import { initializeDatabase } from './db/init';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust first proxy (nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/meets', meetRoutes);
app.use('/api/invitations', invitationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Initialize
async function start() {
  initializeDatabase();
  await seedAdmin();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reading Circle server running on port ${PORT}`);
  });
}

start().catch(console.error);
