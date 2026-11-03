const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Ensure production logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 1. Load environment variables with server/.env taking precedence
dotenv.config({ path: path.join(__dirname, 'server', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const folderName = path.basename(__dirname);
const appName = process.env.PM2_APP_NAME || process.env.APP_NAME || `masuma-platform`;
const appPort = parseInt(process.env.PORT || '3000', 10);

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join(__dirname, 'server', 'dist', 'app.js'),
      cwd: __dirname,
      exec_mode: 'fork', // Set to 'cluster' if scaling across multi-core CPUs
      instances: 1,      // Or 'max' for CPU cluster scaling
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 200, // Exponential backoff prevents CPU spikes during transient DB reconnects
      kill_timeout: 5000,            // Graceful shutdown: allows in-flight HTTP requests to drain
      listen_timeout: 10000,
      min_uptime: '10s',
      max_restarts: 15,
      output: path.join(logsDir, 'pm2-out.log'),
      error: path.join(logsDir, 'pm2-error.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: appPort
      }
    }
  ]
};
