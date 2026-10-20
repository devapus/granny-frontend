import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

// Reduced motion makes the house start inside the memorial room, so these tests don't have to
// sit through the camera flight (that path is covered by the unit tests of the scene machine).
test.use({ reducedMotion: 'reduce' })

test.describe('memorial', () => {
  test('visitor enters the memorial, walks the walls and opens/closes a tribute', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'House of Memories' })).toBeVisible()

    await page.getByRole('link', { name: 'Enter the house' }).first().click()
    await expect(page).toHaveURL(/\/experience$/)

    // Memorial room → first wall (children come first, whatever order the API returned).
    await page.getByRole('button', { name: /walk through the memories/i }).click()
    await expect(page.getByRole('status')).toContainText('Wall 1 of 3 · Children')
    await expect(page.getByRole('button', { name: 'Read tribute from Susan Whitfield' })).toBeVisible()

    // Next wall.
    await page.getByRole('button', { name: 'Next wall' }).click()
    await expect(page.getByRole('status')).toContainText('Wall 2 of 3 · Grandchildren')

    // Open the reading window and close it with Escape; we stay on the same wall.
    await page.getByRole('button', { name: 'Read tribute from Oliver Whitfield' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/read=t-grand/)
    await expect(dialog).toContainText('Oliver Whitfield')
    await expect(dialog).toContainText('kettle on')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('status')).toContainText('Wall 2 of 3 · Grandchildren')

    // And again with the Close button.
    await page.getByRole('button', { name: 'Read tribute from Oliver Whitfield' }).click()
    await page.getByRole('button', { name: 'Close tribute' }).click()
    await expect(dialog).toBeHidden()
  })

  test('navigates between the public pages', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Tributes', exact: true }).first().click()
    await expect(page).toHaveURL(/\/tributes$/)
    await expect(page.getByText('Susan Whitfield').first()).toBeVisible()

    await page.getByRole('link', { name: 'Gallery', exact: true }).first().click()
    await expect(page).toHaveURL(/\/gallery$/)

    await page.getByRole('link', { name: /leave a tribute/i }).first().click()
    await expect(page).toHaveURL(/\/submit$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Share a memory')
  })

  test('visitor submits a tribute (Idempotency-Key sent, success message shown)', async ({ page }) => {
    const api = await mockApi(page)
    await page.goto('/submit')

    await page.getByLabel('Your name').fill('Jane Doe')
    await page.getByRole('textbox', { name: /^email address/i }).fill('jane@example.com')
    await page.getByLabel('How did you know her?').selectOption('grandchildren')
    await page
      .getByLabel('Your tribute')
      .fill('Grandma taught me to bake bread on Sunday mornings and I still hear her humming.')
    await page.getByLabel(/i understand my tribute will be reviewed/i).check()
    await page.getByRole('button', { name: 'Submit tribute' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Thank you' })).toBeVisible()
    expect(api.submissions).toHaveLength(1)
    expect(api.submissions[0]!.headers['idempotency-key']).toBeTruthy()
    expect(api.submissions[0]!.body).toMatchObject({ fullName: 'Jane Doe', relationshipCategory: 'grandchildren' })
  })

  test('admin area is blocked without a session and /admin/login is not linked publicly', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page.locator('a[href*="admin"]')).toHaveCount(0)

    await page.goto('/admin/pending')
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByRole('heading', { name: /admin sign in/i })).toBeVisible()
  })
})
