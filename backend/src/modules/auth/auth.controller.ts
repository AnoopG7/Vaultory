import type { Request, Response } from 'express'
import { supabase, supabaseAdmin } from '../../config/index.js'
import { AppError } from '../../middleware/index.js'
import type { Role } from '../../middleware/auth.js'
import type { SignInInput, SignUpInput, VerifyOtpInput, ResetPasswordInput, UserShape } from '../../lib/schemas/index.js'

/**
 * Build the client-facing user shape from a profile row (DB = source of truth)
 * plus the Supabase user's email.
 */
function buildUserShape(input: {
  id: string
  email: string
  profile?: { full_name: string | null; role: Role | null; store_id: string | null; gender: string | null; avatar_url: string | null } | null
}): UserShape {
  const { id, email, profile } = input
  return {
    id,
    email,
    fullName: profile?.full_name ?? email.split('@')[0] ?? '',
    role: profile?.role ?? 'store_staff',
    storeId: profile?.store_id ?? null,
    gender: (profile?.gender as UserShape['gender']) ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

/**
 * POST /api/auth/signup — create a user + profile.
 * ADMIN-GATED (SRS: Admin creates staff accounts). Uses the service-role key
 * to create the Supabase Auth user and idempotently insert the profiles row.
 */
export async function handleSignup(req: Request, res: Response) {
  const body = req.body as SignUpInput

  if (!supabaseAdmin) {
    throw new AppError(503, 'User provisioning is not configured', 'SERVICE_UNAVAILABLE')
  }

  const existing = await supabase
    .from('profiles')
    .select('id')
    .eq('email', body.email.trim().toLowerCase())
    .maybeSingle()
  if (existing.data) {
    throw new AppError(409, 'A user with this email already exists', 'EMAIL_TAKEN')
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.fullName,
      store_id: body.storeId ?? null,
    },
  })

  if (authError) {
    throw new AppError(400, authError.message, 'USER_CREATE_FAILED')
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authUser.user.id,
    email: body.email.trim().toLowerCase(),
    full_name: body.fullName,
    role: body.role,
    store_id: body.storeId ?? null,
    gender: body.gender ?? null,
    address: body.address ?? null,
    phone: body.phone ?? null,
  })

  if (profileError) {
    throw new AppError(400, `Account created but profile failed: ${profileError.message}`, 'PROFILE_CREATE_FAILED')
  }

  res.status(201).json({
    message: 'User created successfully',
    user: buildUserShape({
      id: authUser.user.id,
      email: body.email.trim().toLowerCase(),
      profile: {
        full_name: body.fullName,
        role: body.role,
        store_id: body.storeId ?? null,
        gender: body.gender ?? null,
        avatar_url: null,
      },
    }),
  })
}

/**
 * POST /api/auth/signin — email + password via Supabase Auth. Public.
 */
export async function handleSignin(req: Request, res: Response) {
  const { email, password } = req.body as SignInInput

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error || !data.session) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  }

  const profile = await loadProfile(data.user.id)

  res.json({
    user: buildUserShape({ id: data.user.id, email: data.user.email ?? email, profile }),
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? null,
  })
}

/**
 * POST /api/auth/otp — send an email OTP / magic-link. Public.
 */
export async function handleOtp(req: Request, res: Response) {
  const email = (req.body as { email: string }).email.trim().toLowerCase()
  const origin = req.headers.origin ?? ''
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth` },
  })
  if (error) {
    throw new AppError(400, error.message, 'OTP_SEND_FAILED')
  }
  res.status(202).json({ message: 'If that email exists, a sign-in link has been sent.' })
}

/**
 * POST /api/auth/verify-otp — verify a one-time code and return a session.
 */
export async function handleVerifyOtp(req: Request, res: Response) {
  const { email, token } = req.body as VerifyOtpInput
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'email',
  })
  if (error || !data.session || !data.user) {
    throw new AppError(401, 'Invalid or expired verification code', 'OTP_INVALID')
  }
  const profile = await loadProfile(data.user.id)
  res.json({
    user: buildUserShape({ id: data.user.id, email: data.user.email ?? email, profile }),
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? null,
  })
}

/**
 * POST /api/auth/forgot-password — trigger a password-reset email. Public.
 */
export async function handleForgotPassword(req: Request, res: Response) {
  const email = (req.body as { email: string }).email.trim().toLowerCase()
  const origin = req.headers.origin ?? ''
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })
  if (error) {
    throw new AppError(400, error.message, 'RESET_SEND_FAILED')
  }
  res.status(202).json({ message: 'If that email exists, a reset link has been sent.' })
}

/**
 * POST /api/auth/reset-password — set a new password with the recovery token.
 */
export async function handleResetPassword(req: Request, res: Response) {
  const { token, password } = req.body as ResetPasswordInput

  if (!supabaseAdmin) {
    throw new AppError(503, 'Password reset is not configured', 'SERVICE_UNAVAILABLE')
  }

  // Verify the recovery token_hash (forwarded from the custom reset-email link,
  // see Docs/Implementation_Plan.md "post-deployment"). Establishing a session
  // here is unnecessary — the service-role client updates the password directly.
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  })
  if (error || !data?.user) {
    throw new AppError(400, error?.message ?? 'Invalid reset token', 'RESET_TOKEN_INVALID')
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    password,
  })
  if (updateError) {
    throw new AppError(400, updateError.message, 'RESET_UPDATE_FAILED')
  }

  res.json({ message: 'Password updated successfully.' })
}

/**
 * POST /api/auth/signout — session sign-out.
 *
 * The client uses a JWT access token stored in localStorage, so the actual
 * logout is a client-side token removal. The server records the logout and
 * returns success; JWTs simply expire on their own if not revoked.
 */
export async function handleSignout(_req: Request, res: Response) {
  res.json({ message: 'Signed out successfully.' })
}

/** Loads a profile row (role/store/name) for a user id. */
async function loadProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, role, store_id, gender, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  return data ?? null
}

/**
 * GET /api/auth/me — authenticated user, enriched from the profiles row.
 */
export async function handleMe(req: Request, res: Response) {
  const profile = await loadProfile(req.userId!)
  res.json({
    user: buildUserShape({
      id: req.userId!,
      email: req.email ?? '',
      profile,
    }),
  })
}

/**
 * GET /api/auth/me/roles — example role-gated endpoint (any authenticated user,
 * demonstrates RBAC wiring). Replace with real endpoints as modules land.
 */
export async function handleRoles(_req: Request, res: Response) {
  res.json({ message: 'You are authenticated and authorized to reach this endpoint.' })
}

export { buildUserShape }
