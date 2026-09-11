import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env.js'

/**
 * Supabase is used strictly as:
 *   - PostgreSQL (data storage)
 *   - Auth (email/password + email OTP magic links)
 *   - Storage (uploads)
 *
 * All business logic / RBAC / data masking lives in this Node service,
 * NOT in Supabase Row Level Security, per the SRS.
 *
 * The deployed Supabase project has RLS enabled on the tables. Because RBAC is
 * enforced in the service (not in RLS), the default client is the service-role
 * client, which bypasses RLS. The anon client is used ONLY for public Auth
 * endpoints (sign-in / OTP / reset) where a real user session must be issued.
 */

function makeClient(key: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Default client for all data access. Prefers the service-role key (bypasses
// RLS); falls back to anon when the key is unset (e.g. local mock).
export const supabase: SupabaseClient = env.SUPABASE_SERVICE_ROLE_KEY
  ? makeClient(env.SUPABASE_SERVICE_ROLE_KEY)
  : makeClient(env.SUPABASE_ANON_KEY)

// Public anon client — reserved for issuing real user sessions via the Auth API.
export const supabaseAnon: SupabaseClient = makeClient(env.SUPABASE_ANON_KEY)

// Service-role client for privileged server-side operations (e.g. user mgmt).
// Optional: only set when deployment has a service-role key.
export const supabaseAdmin: SupabaseClient | null = env.SUPABASE_SERVICE_ROLE_KEY
  ? makeClient(env.SUPABASE_SERVICE_ROLE_KEY)
  : null
