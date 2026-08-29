import 'dotenv/config'
import { z } from 'zod'

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  // Supabase (PostgreSQL + Auth + Storage only; business logic lives here in Node)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  // Groq (LLM forecasting / recommendations). Optional so the server runs without AI.
  GROQ_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
