import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database Configuration
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("postgres"),
  DB_NAME: z.string().default("storify"),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().default(2000),

  // Authentication
  JWT_SECRET: z.string().default("dev-jwt-secret-key-change-in-production"),
  JWT_EXPIRES_IN: z.string().default("1d"),

  // Storage / S3 Configuration
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().default("test"),
  AWS_SECRET_ACCESS_KEY: z.string().default("test"),
  S3_BUCKET_NAME: z.string().default("storify-bucket"),
  S3_ENDPOINT: z.string().optional().default("http://localhost:4566"),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((val) => val === "true"),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables configuration:", parsed.error.format());
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const config = loadConfig();