import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { connectDB, disconnectDB } from './db.js';
import { seedDatabase } from './seed.js';

// Route imports
import authRoutes from './routes/auth.js';
import inquiriesRoutes from './routes/inquiries.js';
import followupsRoutes from './routes/followups.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import usersRoutes from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Static public directory for uploaded logos or images
const publicDir = path.resolve(__dirname, '../../client/public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    portal: 'UNIVERSEBYTE – INQUIRY MANAGEMENT PORTAL',
    tagline: 'Technology Redefined.',
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend if client/dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = config.port;

// Start server only after database is connected
async function startServer() {
  try {
    await connectDB();
    await seedDatabase().catch((err) =>
      console.error('Database seeding check notice:', err.message)
    );

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` UNIVERSEBYTE – INQUIRY MANAGEMENT PORTAL BACKEND`);
      console.log(` Technology Redefined.`);
      console.log(` Database: MongoDB Atlas (Mongoose)`);
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server due to database connection error:', error.message);
    process.exit(1);
  }
}

startServer();

export default app;
