import { test, expect, type Page } from '@playwright/test'

// Browser workflows against a mocked API: requests that are not mocked fail, which the pages must tolerate.

const admin = {
  id: 1, name: 'Admin User', email: 'admin@coreplatform.dev', role: 'Administrator', status: 'Active', department: 'IT', console_access: null,
  last_login: null, preferred_name: null, phone: null, personal_email: null, photo_url: null, email_preferences: [],
  permissions: ['dashboard.view', 'users.view', 'users.edit', 'users.create', 'roles.manage', 'settings.manage', 'audit.view', 'reports.view', 'messages.send', 'announcements.send'],
  modules: [],
}

async function signIn(page: Page, user = admin) {
  await page.addInitScript(() => sessionStorage.setItem('core_token', 'test-session'))
  // Never reach a real backend: it would reject the fake token. Later routes take precedence.
  await page.route('**/api/v1/**', route => route.fulfill({ status: 503, json: { detail: 'Not available in this test' } }))
  await page.route('**/api/v1/notifications*', route => route.fulfill({ json: { unread_count: 0, items: [], has_more: false, next_before: 0 } }))
  await page.route('**/api/v1/me', route => route.fulfill({ json: user }))
}

test('mobile registration keeps the consent checkbox and form inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  const checkbox = page.getByRole('checkbox', { name: 'I accept the privacy notice' })
  await expect(checkbox).toBeVisible()
  await checkbox.check()
  expect((await checkbox.boundingBox())!.width).toBeLessThanOrEqual(20)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('administrator without dashboard permission lands on home without a redirect loop', async ({ page }) => {
  await signIn(page, { ...admin, permissions: ['users.view', 'users.edit', 'roles.manage', 'settings.manage'] })
  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
})

test('registration sends confirmation and explicit privacy consent', async ({ page }) => {
  let payload: unknown
  await page.route('**/api/v1/auth/register', async route => {
    payload = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: { id: 9, status: 'Pending' } })
  })
  await page.goto('/register')
  await page.getByLabel('Full name').fill('New Applicant')
  await page.getByLabel('Email address').fill('new@example.edu')
  await page.getByLabel('Password', { exact: true }).fill('secret123')
  await page.getByLabel('Repeat password').fill('secret123')
  await page.getByLabel('I accept the privacy notice').check()
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your account was created')
  expect(payload).toEqual({ name: 'New Applicant', email: 'new@example.edu', password: 'secret123', confirm_password: 'secret123', privacy_accepted: true })
})

test('registration catches mismatched passwords before making a request', async ({ page }) => {
  let requests = 0
  await page.route('**/api/v1/auth/register', route => { requests++; return route.fulfill({ status: 500 }) })
  await page.goto('/register')
  await page.getByLabel('Full name').fill('New Applicant')
  await page.getByLabel('Email address').fill('new@example.edu')
  await page.getByLabel('Password', { exact: true }).fill('secret123')
  await page.getByLabel('Repeat password').fill('different123')
  await page.getByLabel('I accept the privacy notice').check()
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('do not match')
  expect(requests).toBe(0)
})

test('confirmation uses the purpose sent by the backend and redeems once', async ({ page }) => {
  let requests = 0
  await page.route('**/api/v1/auth/email-link', route => {
    requests++
    expect(route.request().postDataJSON()).toEqual({ token: 'confirm-token' })
    return route.fulfill({ json: { detail: 'Confirmed' } })
  })
  await page.goto('/email-link?token=confirm-token&purpose=confirm')
  await expect(page.getByRole('status')).toContainText('Your email is confirmed')
  expect(requests).toBe(1)
  await expect(page.getByLabel('New password')).toHaveCount(0)
})

test('invitation and reset links send both passwords', async ({ page }) => {
  await page.route('**/api/v1/auth/email-link', route => {
    expect(route.request().postDataJSON()).toEqual({ token: 'invite-token', password: 'newsecret123', confirm_password: 'newsecret123' })
    return route.fulfill({ json: { detail: 'Password updated' } })
  })
  await page.goto('/email-link?token=invite-token&purpose=invite')
  await expect(page.getByRole('heading', { name: 'Set up your account' })).toBeVisible()
  await page.getByLabel('New password', { exact: true }).fill('newsecret123')
  await page.getByLabel('Repeat new password').fill('newsecret123')
  await page.getByRole('button', { name: 'Set password', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your password is set')
})

test('reports always send a period and render object rows and missing modules', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/reports?*', route => {
    const url = new URL(route.request().url())
    expect(url.searchParams.get('period')).toBeTruthy()
    return route.fulfill({ json: { period: url.searchParams.get('period'), scope: 'platform', columns: ['module', 'metric', 'value'], rows: [{ module: 'lms', metric: 'Courses', value: '12' }], missing_modules: [{ module: 'sis', reason: 'Unavailable or not configured' }] } })
  })
  await page.goto('/reports')
  await expect(page.getByRole('cell', { name: 'Courses', exact: true })).toBeVisible()
  await expect(page.getByText('SIS: Unavailable or not configured')).toBeVisible()
  await page.getByLabel('Report period').fill('Spring 2027')
  await page.getByRole('button', { name: 'Generate report' }).click()
  await expect(page.getByText('Period: Spring 2027')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('student cannot open administrator routes', async ({ page }) => {
  await signIn(page, { ...admin, role: 'Student', permissions: ['directory.view', 'messages.send'] })
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0)
})

test('editing a user submits only the changed fields', async ({ page }) => {
  await signIn(page)
  const other = { ...admin, id: 2, name: 'Dr. Daniel Reed', email: 'faculty@coreplatform.dev', role: 'Faculty' }
  await page.route('**/api/v1/users?*', route => route.fulfill({ json: { items: [other], total: 1, page: 0, size: 25 } }))
  await page.route('**/api/v1/users/2', route => {
    expect(route.request().postDataJSON()).toEqual({ name: 'Daniel Reed' })
    return route.fulfill({ json: { ...other, name: 'Daniel Reed' } })
  })
  await page.goto('/admin/users')
  await page.getByRole('button', { name: /Dr\. Daniel Reed/ }).click()
  await page.getByRole('dialog').getByLabel('Full name').fill('Daniel Reed')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Daniel Reed was updated')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('notifications use read_at and update the unread count after opening one', async ({ page }) => {
  await signIn(page)
  let read = false
  await page.route('**/api/v1/notifications*', route => route.fulfill({ json: { unread_count: read ? 0 : 1, items: [{ id: 4, source: 'lms', category: 'grades', title: 'New grade', text: 'Check LMS', created_at: '2026-11-11T00:00:00Z', read_at: read ? '2026-11-11T01:00:00Z' : null }], has_more: false, next_before: 0 } }))
  await page.route('**/api/v1/notifications/read', route => {
    expect(route.request().postDataJSON()).toEqual({ ids: [4] }); read = true
    return route.fulfill({ status: 204 })
  })
  await page.goto('/notifications')
  await expect(page.getByText('1 unread')).toBeVisible()
  await page.getByRole('button', { name: /New grade/ }).click()
  await expect(page.getByText('All read')).toBeVisible()
})

test('expired session signs the user out', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/reports?*', route => route.fulfill({ status: 401, json: { detail: 'Expired' } }))
  await page.goto('/reports')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Your session has expired. Please sign in again.')).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('core_token'))).toBeNull()
})

test('settings preserve roles and use session_timeout when saved', async ({ page }) => {
  await signIn(page)
  const settings = { settings: { university_name: 'University', term_start: null, term_end: null, email_sender: 'no-reply@example.edu', min_password_length: 8, session_timeout: 30, lockout_attempts: 5 }, modules: [{ code: 'sis', name: 'SIS', enabled: true }], roles: [{ code: 'Administrator', user_count: 1, permissions: ['settings.manage'] }], permission_codes: ['settings.manage'] }
  await page.route('**/api/v1/admin/settings', route => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON()
      expect(payload.settings.session_timeout).toBe(20)
      expect(payload.settings).not.toHaveProperty('session_timeout_minutes')
      expect(payload.roles).toEqual([{ code: 'Administrator', permissions: ['settings.manage'] }])
      expect(payload.modules).toEqual([{ code: 'sis', enabled: true }])
    }
    return route.fulfill({ json: settings })
  })
  await page.goto('/admin/settings')
  await page.getByLabel('session timeout').fill('20')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByRole('status')).toContainText('Settings saved')
})

test('activity log sends date filters as instants', async ({ page }) => {
  await signIn(page)
  const queries: URLSearchParams[] = []
  await page.route('**/api/v1/admin/audit*', route => {
    queries.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: [{ id: 1, timestamp: '2026-11-10T10:00:00Z', actor: 'admin@coreplatform.dev', action: 'Signed in', target: 'admin@coreplatform.dev', result: 'Success' }] })
  })
  await page.goto('/admin/audit')
  await expect(page.getByRole('cell', { name: 'Signed in', exact: true })).toBeVisible()
  await page.getByLabel('From').fill('2026-11-01')
  await expect.poll(() => queries.at(-1)?.get('from') ?? '').toMatch(/^2026-1[01]-\d\dT\d\d:00:00\.000Z$/)
})

test('roles page is read-only for console users who are not administrators', async ({ page }) => {
  await signIn(page, { ...admin, role: 'Staff', console_access: 'Viewer', permissions: ['users.view', 'dashboard.view', 'reports.view'] })
  await page.route('**/api/v1/roles', route => route.fulfill({ json: [{ code: 'Viewer', permissions: ['users.view', 'dashboard.view'] }] }))
  await page.goto('/admin/roles')
  await expect(page.getByRole('cell', { name: /View users and roles/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit permissions' })).toHaveCount(0)
})
