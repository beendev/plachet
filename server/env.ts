import { config as loadDotenv } from "dotenv";

let envLoaded = false;

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value == null || value.trim() === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseNumber(value: string | undefined, defaultValue: number) {
  if (value == null || value.trim() === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return parsed;
}

function parseCsv(value: string | undefined) {
  if (!value || !value.trim()) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function loadServerEnv() {
  if (envLoaded) {
    return;
  }

  loadDotenv({ path: ".env.local", override: false });
  loadDotenv({ path: ".env", override: false });
  envLoaded = true;
}

export function getServerEnv() {
  loadServerEnv();

  return {
    appUrl: process.env.APP_URL?.trim() || "",
    marketingWebsiteUrl: process.env.MARKETING_WEBSITE_URL?.trim() || "",
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    exportCodeEnabled: parseBoolean(process.env.EXPORT_CODE_ENABLED, false),
    exportCodeToken: process.env.EXPORT_CODE_TOKEN?.trim() || "",
    sessionSecret: process.env.SESSION_SECRET?.trim() || "",
    authRequired: parseBoolean(process.env.AUTH_REQUIRED, false),
    corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS),
    corsStrict: parseBoolean(process.env.CORS_STRICT, false),
    rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
    rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 300),
    authRateLimitWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authRateLimitMax: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
    blockedEmailDomains: parseCsv(process.env.BLOCKED_EMAIL_DOMAINS),
    supabaseUrl: process.env.SUPABASE_URL?.trim() || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
    supabaseSyncEnabled: parseBoolean(process.env.SUPABASE_SYNC_ENABLED, false),
  };
}
