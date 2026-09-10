import type { Server } from 'node:http'
import { createApp } from '../src/app.js'
import { memoryUsers, memoryAuditLogs } from '../src/modules/users/users.store.js'

let server: Server
let baseUrl: string

async function startServer(): Promise<void> {
  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}/api`
      }
      resolve()
    })
  })
}

async function stopServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`)
    passedTests++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    failedTests++
  }
}

async function runTests() {
  console.log('\n======================================================')
  console.log('  VAULTORY ADMIN USER MANAGEMENT TEST SUITE')
  console.log('======================================================\n')

  await startServer()

  const adminToken = 'dev-admin-token'
  const staffToken = 'dev-token:00000000-0000-0000-0000-000000000002' // Vikram (store_staff)

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHORIZATION TESTS
    // -------------------------------------------------------------------------
    console.log('1. Authorization & RBAC:')

    // 1a. Unauthenticated request
    const unauthRes = await fetch(`${baseUrl}/users`)
    assert(unauthRes.status === 401, 'Unauthenticated request to /api/users is rejected (401)')

    // 1b. Non-admin request
    const nonAdminRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    assert(nonAdminRes.status === 403, 'Non-admin request to /api/users is rejected (403 Forbidden)')

    // 1c. Admin request
    const adminRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(adminRes.status === 200, 'Admin request to /api/users is authorized (200 OK)')
    const adminList = await adminRes.json()
    assert(Array.isArray(adminList.users), 'Admin receives users list array')
    assert(adminList.total > 0, 'Admin receives non-zero total count')

    // -------------------------------------------------------------------------
    // 2. CREATE USER TESTS
    // -------------------------------------------------------------------------
    console.log('\n2. User Creation & Validation:')

    const testEmail = `test.staff.${Date.now()}@vaultory.internal`
    const validCreatePayload = {
      email: testEmail,
      password: 'StrongPassword123!',
      fullName: 'Integration Test User',
      role: 'store_staff',
      storeId: 'e1000000-0000-0000-0000-000000000001', // Store A
      phone: '+91 98200 99999',
      address: '77 Marine Drive, Mumbai',
      gender: 'male',
    }

    // 2a. Valid creation
    const createRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(validCreatePayload),
    })
    assert(createRes.status === 201, 'Admin can create a valid user (201 Created)')
    const createdBody = await createRes.json()
    const createdUser = createdBody.user
    assert(createdUser.email === testEmail, 'Created user has matching email')
    assert(createdUser.full_name === 'Integration Test User', 'Created user has matching full_name')
    assert(createdUser.role === 'store_staff', 'Created user has matching role')
    assert(createdUser.store_id === 'e1000000-0000-0000-0000-000000000001', 'Created user has matching store_id')
    assert(createdUser.status === 'active', 'Created user has default status active')

    // 2b. Duplicate email rejection
    const duplicateRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(validCreatePayload),
    })
    assert(duplicateRes.status === 409, 'Duplicate email creation is rejected with 409 Conflict')

    // 2c. Invalid email format
    const invalidEmailRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...validCreatePayload,
        email: 'not-an-email',
      }),
    })
    assert(invalidEmailRes.status === 400, 'Invalid email format is rejected (400)')

    // 2d. Short password (< 8 chars)
    const shortPassRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...validCreatePayload,
        email: `shortpass.${Date.now()}@vaultory.internal`,
        password: '123',
      }),
    })
    assert(shortPassRes.status === 400, 'Password shorter than 8 characters is rejected (400)')

    // 2e. Nonexistent store ID
    const badStoreRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...validCreatePayload,
        email: `badstore.${Date.now()}@vaultory.internal`,
        storeId: '00000000-0000-0000-0000-999999999999',
      }),
    })
    assert(badStoreRes.status === 400, 'Nonexistent store ID is rejected (400 STORE_NOT_FOUND)')

    // -------------------------------------------------------------------------
    // 3. SEARCH & FILTERING TESTS
    // -------------------------------------------------------------------------
    console.log('\n3. User Search & Filtering:')

    // 3a. Search by name
    const searchNameRes = await fetch(`${baseUrl}/users?search=Integration%20Test`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const searchNameBody = await searchNameRes.json()
    assert(
      searchNameBody.users.some((u: { id: string }) => u.id === createdUser.id),
      'Search by user full name returns matching user',
    )

    // 3b. Search by email
    const searchEmailRes = await fetch(`${baseUrl}/users?search=${encodeURIComponent(testEmail)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const searchEmailBody = await searchEmailRes.json()
    assert(
      searchEmailBody.users.some((u: { id: string }) => u.id === createdUser.id),
      'Search by user email returns matching user',
    )

    // 3c. Search by phone
    const searchPhoneRes = await fetch(`${baseUrl}/users?search=99999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const searchPhoneBody = await searchPhoneRes.json()
    assert(
      searchPhoneBody.users.some((u: { id: string }) => u.id === createdUser.id),
      'Search by user phone returns matching user',
    )

    // 3d. Role filter
    const filterRoleRes = await fetch(`${baseUrl}/users?role=sales_personnel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const filterRoleBody = await filterRoleRes.json()
    assert(
      filterRoleBody.users.every((u: { role: string }) => u.role === 'sales_personnel'),
      'Filtering by role returns only users with requested role',
    )

    // 3e. Store filter
    const filterStoreRes = await fetch(
      `${baseUrl}/users?store_id=e1000000-0000-0000-0000-000000000001`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    )
    const filterStoreBody = await filterStoreRes.json()
    assert(
      filterStoreBody.users.every(
        (u: { store_id: string | null }) => u.store_id === 'e1000000-0000-0000-0000-000000000001',
      ),
      'Filtering by store returns only users mapped to requested store',
    )

    // 3f. Non-matching search
    const noMatchRes = await fetch(`${baseUrl}/users?search=NoSuchPersonExistsXYZ987`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const noMatchBody = await noMatchRes.json()
    assert(noMatchBody.users.length === 0, 'Non-matching search returns 0 results cleanly')

    // -------------------------------------------------------------------------
    // 4. USER UPDATE & PERSISTENCE TESTS
    // -------------------------------------------------------------------------
    console.log('\n4. User Editing & Role/Store Assignment:')

    // 4a. Update role and store
    const updateRes = await fetch(`${baseUrl}/users/${createdUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Integration Test User Updated',
        role: 'sales_personnel',
        storeId: 'e1000000-0000-0000-0000-000000000002', // Store B
        phone: '+91 98200 77777',
      }),
    })
    assert(updateRes.status === 200, 'User update succeeds with 200 OK')
    const updateBody = await updateRes.json()
    assert(updateBody.user.full_name === 'Integration Test User Updated', 'Updated full name persisted')
    assert(updateBody.user.role === 'sales_personnel', 'Updated role persisted')
    assert(
      updateBody.user.store_id === 'e1000000-0000-0000-0000-000000000002',
      'Updated store_id persisted',
    )
    assert(updateBody.user.phone === '+91 98200 77777', 'Updated phone persisted')

    // 4b. Verify persistence by re-fetching user
    const refetchRes = await fetch(`${baseUrl}/users/${createdUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const refetchBody = await refetchRes.json()
    assert(
      refetchBody.user.role === 'sales_personnel' &&
        refetchBody.user.store_id === 'e1000000-0000-0000-0000-000000000002',
      'Changes are persisted and remain after re-fetch',
    )

    // -------------------------------------------------------------------------
    // 5. CRITICAL SELF-PROTECTION GUARDS
    // -------------------------------------------------------------------------
    console.log('\n5. Self-Protection Guards (Rule 1 & Rule 2):')

    const adminId = '00000000-0000-0000-0000-000000000001'

    // 5a. Self-deactivation prevention
    const selfDeactivateRes = await fetch(`${baseUrl}/users/${adminId}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'archived' }),
    })
    assert(
      selfDeactivateRes.status === 400,
      'Admin cannot deactivate own account (400 SELF_DEACTIVATE_FORBIDDEN)',
    )
    const selfDeactivateErr = await selfDeactivateRes.json()
    assert(
      selfDeactivateErr.code === 'SELF_DEACTIVATE_FORBIDDEN',
      'Error code is SELF_DEACTIVATE_FORBIDDEN',
    )

    // 5b. Self-admin-role removal prevention
    const selfRoleRes = await fetch(`${baseUrl}/users/${adminId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'store_staff' }),
    })
    assert(
      selfRoleRes.status === 400,
      'Admin cannot revoke own admin role (400 SELF_ROLE_REVOKE_FORBIDDEN)',
    )
    const selfRoleErr = await selfRoleRes.json()
    assert(
      selfRoleErr.code === 'SELF_ROLE_REVOKE_FORBIDDEN',
      'Error code is SELF_ROLE_REVOKE_FORBIDDEN',
    )

    // -------------------------------------------------------------------------
    // 6. DEACTIVATION & HISTORICAL RETENTION
    // -------------------------------------------------------------------------
    console.log('\n6. Soft-Deactivation & Historical Retention:')

    // 6a. Deactivate target user
    const deactivateRes = await fetch(`${baseUrl}/users/${createdUser.id}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'archived' }),
    })
    assert(deactivateRes.status === 200, 'Deactivation succeeds with 200 OK')
    const deactivateBody = await deactivateRes.json()
    assert(deactivateBody.user.status === 'archived', 'User status becomes "archived"')

    // 6b. Verify record is NOT deleted (retention safe)
    const checkDeletedRes = await fetch(`${baseUrl}/users/${createdUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(checkDeletedRes.status === 200, 'Deactivated user profile still exists (no hard deletion)')
    const retainedUser = await checkDeletedRes.json()
    assert(retainedUser.user.id === createdUser.id, 'User record and ID remain intact')
    assert(retainedUser.user.status === 'archived', 'User status is archived')

    // 6c. Reactivate target user
    const reactivateRes = await fetch(`${baseUrl}/users/${createdUser.id}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'active' }),
    })
    assert(reactivateRes.status === 200, 'Reactivation succeeds with 200 OK')
    const reactivateBody = await reactivateRes.json()
    assert(reactivateBody.user.status === 'active', 'User status restored to "active"')

    // Re-deactivate for authentication testing
    await fetch(`${baseUrl}/users/${createdUser.id}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'archived' }),
    })

    // -------------------------------------------------------------------------
    // 7. AUTHENTICATION & SESSION ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n7. Authentication & Existing-Session Blocking:')

    // 7a. New sign-in attempt by deactivated user
    const signinRes = await fetch(`${baseUrl}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'StrongPassword123!',
      }),
    })
    assert(
      signinRes.status === 403,
      'Deactivated user attempting to sign in is rejected (403 Forbidden)',
    )
    const signinErr = await signinRes.json()
    assert(
      signinErr.code === 'ACCOUNT_DEACTIVATED',
      'Sign-in error code is ACCOUNT_DEACTIVATED',
    )

    // 7b. Existing session / JWT token used by deactivated user against protected endpoint
    const deactivatedUserToken = `dev-token:${createdUser.id}`
    const protectedRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${deactivatedUserToken}` },
    })
    assert(
      protectedRes.status === 403,
      'Deactivated user with existing token calling protected /api/auth/me is blocked (403)',
    )
    const protectedErr = await protectedRes.json()
    assert(
      protectedErr.code === 'ACCOUNT_DEACTIVATED',
      'Protected resource error code is ACCOUNT_DEACTIVATED',
    )

    // 7c. Active user access to protected endpoint is allowed
    const activeStaffToken = 'dev-token:00000000-0000-0000-0000-000000000002' // Vikram
    const activeRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${activeStaffToken}` },
    })
    assert(activeRes.status === 200, 'Active user session can access protected /api/auth/me (200 OK)')

    // -------------------------------------------------------------------------
    // 8. AUDIT LOGGING VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n8. Audit Logging Verification:')

    const userCreatedAudit = memoryAuditLogs.find((l) => l.action === 'user_created')
    assert(Boolean(userCreatedAudit), 'user_created event was recorded in audit logs')

    const userUpdatedAudit = memoryAuditLogs.find((l) => l.action === 'user_updated')
    assert(Boolean(userUpdatedAudit), 'user_updated event was recorded in audit logs')

    const userDeactivatedAudit = memoryAuditLogs.find((l) => l.action === 'user_deactivated')
    assert(Boolean(userDeactivatedAudit), 'user_deactivated event was recorded in audit logs')

    const userReactivatedAudit = memoryAuditLogs.find((l) => l.action === 'user_reactivated')
    assert(Boolean(userReactivatedAudit), 'user_reactivated event was recorded in audit logs')
  } finally {
    await stopServer()
  }

  console.log('\n------------------------------------------------------')
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed.`)
  console.log('------------------------------------------------------\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
