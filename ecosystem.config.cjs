/* global module */
module.exports = {
  apps: [
    {
      name: "hospital-backend",
      script: "./backend/dist/index.js",
      instances: 1, // cluster mode fallback
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "./logs/pm2_err.log",
      out_file: "./logs/pm2_out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      kill_timeout: 4000, // wait for connections and Baileys sessions to close gracefully
      wait_ready: true,
      listen_timeout: 8000,
    },
  ],
};
