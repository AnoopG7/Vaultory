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
 */

// Public anon client used by the backend to talk to Postgres and Auth.
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Service-role client for privileged server-side operations (e.g. user mgmt).
// Optional: only set when deployment has a service-role key.
export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null
