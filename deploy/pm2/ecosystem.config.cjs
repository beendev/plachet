module.exports = {
  apps: [
    {
      name: "plachet-staging",
      cwd: "/var/www/plachet-staging/current",
      script: "npm",
      args: "run start:prod",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
    },
  ],
};

