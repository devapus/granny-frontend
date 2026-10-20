import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test.use({ reducedMotion: 'reduce' })

test('mobile: the house loads portrait, walls are reachable and nothing overflows horizontally', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)

  await page.getByRole('link', { name: 'Enter the house' }).first().click()
  await page.getByRole('button', { name: /walk through the memories/i }).click()
  await expect(page.getByRole('status')).toContainText('Wall 1 of 3')
  await page.getByRole('button', { name: 'Read tribute from Susan Whitfield' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close tribute' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})
