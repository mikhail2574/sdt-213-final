import { test, expect, type Page } from '@playwright/test'

const admin = {
  id: 1, name: 'Admin User', email: 'admin@coreplatform.dev', role: 'Administrator', status: 'Active', department: 'IT', console_access: null,
  permissions: ['dashboard.view', 'users.view', 'users.edit', 'users.create', 'roles.manage', 'settings.manage', 'audit.view', 'reports.view', 'messages.send', 'directory.view', 'announcements.send'],
  modules: [],
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

async function signIn(page: Page, user = admin) {
  await page.addInitScript(() => sessionStorage.setItem('core_token', 'test-session'))
  await page.route('**/api/v1/me', route => route.fulfill({ json: user }))
}

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
    return route.fulfill({ json: { period: url.searchParams.get('period'), scope: 'platform', columns: ['module', 'metric', 'value'], rows: [{ module: 'lms', metric: 'Courses', value: 12 }], missing_modules: [{ module: 'sis', reason: 'Unavailable or not configured' }] } })
  })
  await page.goto('/reports')
  await expect(page.getByRole('cell', { name: 'Courses', exact: true })).toBeVisible()
  await expect(page.getByText('sis: Unavailable or not configured')).toBeVisible()
  await page.getByLabel('Report period').fill('Fall 2026')
  await page.getByRole('button', { name: 'Generate report' }).click()
  await expect(page.getByText('Period: Fall 2026')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('student cannot open administrator routes', async ({ page }) => {
  await signIn(page, { ...admin, role: 'Student', permissions: ['directory.view', 'messages.send'] })
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0)
})

test('editing your own name submits no unchanged access fields', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/users?*', route => route.fulfill({ json: { items: [admin], total: 1 } }))
  await page.route('**/api/v1/users/1', route => {
    expect(route.request().postDataJSON()).toEqual({ name: 'Updated Admin' })
    return route.fulfill({ json: { ...admin, name: 'Updated Admin' } })
  })
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Full name').fill('Updated Admin')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('User updated')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('notifications use read_at and refresh after marking read', async ({ page }) => {
  await signIn(page)
  let read = false
  await page.route('**/api/v1/notifications?*', route => route.fulfill({ json: { unread_count: read ? 0 : 1, items: [{ id: 4, title: 'New grade', text: 'Check LMS', created_at: '2026-11-11T00:00:00Z', read_at: read ? '2026-11-11T01:00:00Z' : null }], has_more: false, next_before: 0 } }))
  await page.route('**/api/v1/notifications/read', route => {
    expect(route.request().postDataJSON()).toEqual({ ids: [4] }); read = true
    return route.fulfill({ status: 204 })
  })
  await page.goto('/notifications')
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click()
  await expect(page.getByText('0 unread')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as read', exact: true })).toHaveCount(0)
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
  const settings = { settings: { university_name: 'University', term_start: null, term_end: null, email_sender: 'no-reply@example.edu', min_password_length: 8, session_timeout: 30, lockout_attempts: 5 }, modules: [{ code: 'sis', name: 'SIS', enabled: true }], roles: [{ code: 'Administrator', permissions: ['settings.manage'] }], permission_codes: ['settings.manage'] }
  await page.route('**/api/v1/admin/settings', route => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON()
      expect(payload.settings.session_timeout).toBe(20)
      expect(payload.settings).not.toHaveProperty('session_timeout_minutes')
      expect(payload.roles).toEqual(settings.roles)
    }
    return route.fulfill({ json: settings })
  })
  await page.goto('/admin/settings')
  await page.getByLabel('session timeout').fill('20')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByRole('status')).toContainText('Settings saved')
})
