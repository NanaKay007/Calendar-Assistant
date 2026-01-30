import express, { Request, Response } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import calendarRoutes from './routes/calendar.routes';

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
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    },
  })
);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Calendar Assistant API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      calendars: '/api/calendars',
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

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  console.log(`\n📚 API Endpoints:`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   Calendars: http://localhost:${PORT}/api/calendars`);
});

export default app;
