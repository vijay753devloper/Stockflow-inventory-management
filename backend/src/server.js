import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🚀 StockFlow Backend running on port ${PORT}`);
  console.log(`📡 Local Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network Health Check: http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}/api/health`);
  console.log(`=========================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
