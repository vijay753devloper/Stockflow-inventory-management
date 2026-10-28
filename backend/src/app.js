import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration supporting localhost and local network devices (LAN IPs)
const clientUrl = process.env.CLIENT_URL;
const allowedOriginRegex = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (origin === clientUrl || allowedOriginRegex.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true,
  })
);

// Request body and cookie parsers
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: "StockFlow backend is running" });
});

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Catch 404 for undefined routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Centralized error handler
app.use(errorHandler);

export default app;
