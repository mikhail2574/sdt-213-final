import { test, expect, type Page } from '@playwright/test'

// Read-only walk through every page each demo role can open, against a running seeded backend on port 8000.
// Run with LIVE_API_TEST=1. It signs in and out (recorded in the activity log) but creates no other data.

const ROLES: { account: string; start: RegExp; pages: string[] }[] = [
  {
    account: 'Admin',
    start: /\/admin\/dashboard$/,
    pages: ['Home', 'Notifications', 'Messages', 'Directory', 'Announcements', 'Reports', 'Profile', 'Dashboard', 'Users', 'Roles & access', 'Settings', 'System status', 'Activity log'],
  },
  { account: 'Student', start: /\/home$/, pages: ['Home', 'Notifications', 'Messages', 'Directory', 'Profile'] },
  { account: 'Faculty', start: /\/home$/, pages: ['Home', 'Notifications', 'Messages', 'Directory', 'Announcements', 'Reports', 'Profile'] },
  { account: 'Staff (Operator)', start: /\/home$/, pages: ['Home', 'Notifications', 'Messages', 'Directory', 'Profile', 'Dashboard', 'Users', 'Roles & access', 'System status'] },
  { account: 'Staff (Viewer)', start: /\/home$/, pages: ['Home', 'Reports', 'Dashboard', 'Users', 'Roles & access', 'System status'] },
  { account: 'Applicant', start: /\/home$/, pages: ['Home', 'Notifications', 'Messages', 'Profile'] },
]

async function openPage(page: Page, label: string) {
  await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: label, exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /Loading|Checking|Collecting/ })).toHaveCount(0, { timeout: 15000 })
  await expect(page.getByRole('alert'), `${label} shows an error`).toHaveCount(0)
}

for (const role of ROLES) {
  test(`live API: ${role.account} can open every allowed page`, async ({ page }) => {
    test.skip(process.env.LIVE_API_TEST !== '1', 'Requires a seeded backend on port 8000')
    test.setTimeout(90000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto('/login')
    await page.getByRole('button', { name: role.account, exact: true }).click()
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(role.start)

    for (const label of role.pages) await openPage(page, label)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(errors).toEqual([])
  })
}
