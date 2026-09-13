import "dotenv/config";
import { z } from "zod";

const DEV_ADMIN_SECRET = "menuscan-dev-admin-secret-do-not-use-in-prod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),

  /**
   * MongoDB connection string. This is the single source of truth for the
   * database provider/location — change it here and the whole app follows.
   */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").default("mongodb://127.0.0.1:27017/menuscan"),

  /** Primary CORS origin (the Next.js frontend). */
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  /** Optional extra CORS origins, comma-separated. */
  CORS_ORIGINS: z.string().optional().default(""),

  /**
   * Static PIN for the MENU SCAN application administrator.
   * Lightweight MVP gate — NOT a substitute for real authentication.
   */
  APP_ADMIN_PIN: z.string().regex(/^\d{4}$/, "APP_ADMIN_PIN must be exactly 4 digits.").default("3219"),

  /**
   * Secret used to sign the short-lived admin bearer tokens (HS256).
   * Must be a long random value in every environment except local dev.
   */
  ADMIN_SECRET: z.string().min(16, "ADMIN_SECRET must be at least 16 characters.").default(DEV_ADMIN_SECRET),

  /** Lifetime of admin tokens, in jsonwebtoken notation (e.g. "12h"). */
  ADMIN_TOKEN_TTL: z.string().min(1).default("12h"),

  LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Log plainly to stderr BEFORE the logger exists (logger depends on env).
  // No stack traces, no secrets — just the offending fields.
  console.error(
    "Invalid environment configuration:",
    parsed.error.issues.map((issue) => `${issue.path.join(".")} (${issue.message})`).join(", "),
  );
  process.exit(1);
}

const data = parsed.data;

// The development default signer secret must never ship to production.
if (data.NODE_ENV === "production" && data.ADMIN_SECRET === DEV_ADMIN_SECRET) {
  console.error(
    'Invalid environment configuration: ADMIN_SECRET must be overridden in production (the default dev value is not allowed).',
  );
  process.exit(1);
}

export const env = {
  ...data,
  nodeEnv: data.NODE_ENV,
  apiPrefix: "/api",
  isProduction: data.NODE_ENV === "production",
  isDevelopment: data.NODE_ENV === "development",
  isTest: data.NODE_ENV === "test",
} as const;