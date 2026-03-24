// ─────────────────────────────────────────────────────────────────────────────
// ecosystem.config.js — Configuration PM2 pour Astreinte V2
// Usage : pm2 start ecosystem.config.js
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  apps: [
    {
      name: "astreinte",
      script: ".next/standalone/server.js",
      cwd: "/root/Astreinte-V2",   // ← adapter si l'user n'est pas root (ex: /home/deploy/Astreinte-V2)
      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOSTNAME: "0.0.0.0",
      },

      // Redémarre automatiquement si la mémoire dépasse 500 Mo
      max_memory_restart: "500M",

      // Logs
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
