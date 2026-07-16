import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_STORAGE_BUCKET: z.string(),
  GEMINI_API_KEY: z.string(),
  GROQ_API_KEY: z.string().optional(),
  AI_PROVIDER: z.string().default("GEMINI"),
  GOOGLE_APPS_SCRIPT_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional(),
  JWT_SECRET: z.string().default("super-secret-default-key-vardan-saas"),
  JWT_REFRESH_SECRET: z.string().default("super-secret-refresh-key-vardan-saas"),
});


const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables configuration:");
  console.error(JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

export const env = result.data;
export default env;
