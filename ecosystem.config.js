# Zion Recruit - PM2 Ecosystem Config
# Usage: pm2 start ecosystem.config.js
# Alternative to Docker for direct VPS deployment

module.exports = {
  apps: [
    {
      name: 'zion-recruit',
      script: 'serve.js',
      cwd: '/home/zion/zion-recruit',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Auto-restart settings
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,

      // Logging
      error_file: '/home/zion/zion-recruit/logs/error.log',
      out_file: '/home/zion/zion-recruit/logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'zion-messaging-ws',
      script: 'index.ts',
      cwd: '/home/zion/zion-recruit/mini-services/messaging-ws',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      max_memory_restart: '256M',
      autorestart: true,
      watch: false,
      error_file: '/home/zion/zion-recruit/logs/ws-error.log',
      out_file: '/home/zion/zion-recruit/logs/ws-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 3000,
    },
    {
      name: 'zion-job-processor',
      script: 'index.ts',
      cwd: '/home/zion/zion-recruit/mini-services/job-processor',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      max_memory_restart: '256M',
      autorestart: true,
      watch: false,
      error_file: '/home/zion/zion-recruit/logs/job-error.log',
      out_file: '/home/zion/zion-recruit/logs/job-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 3000,
    },
  ],

  deploy: {
    production: {
      user: 'zion',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'https://github.com/Lobatobh/zion-recruit.git',
      path: '/home/zion/zion-recruit',
      'pre-deploy-local': '',
      'post-deploy':
        'npm ci --omit=dev && npx prisma generate && npx prisma db push && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
