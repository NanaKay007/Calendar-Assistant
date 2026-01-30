import express, { Request, Response } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import calendarRoutes from './routes/calendar.routes';
import chatRoutes from './routes/chat.routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Session configuration
export const sessionMiddleware = session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
});
app.use(sessionMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Test-only route: seed session with real tokens (never exposed in production)
if (process.env.NODE_ENV === 'test') {
  app.post('/api/test/seed-session', (req: Request, res: Response) => {
    const { tokens, user } = req.body;
    if (!tokens?.access_token) {
      res.status(400).json({ error: 'tokens.access_token is required' });
      return;
    }
    req.session.tokens = tokens;
    req.session.user = user;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to save session' });
        return;
      }
      res.json({ success: true });
    });
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api', chatRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Calendar Assistant API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      calendars: '/api/calendars',
      chat: '/ws (WebSocket)',
      conversations: '/api/conversations',
      actions: '/api/actions',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

export default app;
