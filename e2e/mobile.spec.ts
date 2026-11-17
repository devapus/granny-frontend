import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test.use({ reducedMotion: 'reduce' })

const horizontalOverflow = () =>
  document.documentElement.scrollWidth - window.innerWidth

test('mobile: the house loads portrait, walls are reachable and nothing overflows horizontally', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  expect(await page.evaluate(horizontalOverflow)).toBeLessThanOrEqual(0)

  await page.getByRole('link', { name: 'Enter the house' }).first().click()
  await page.getByRole('button', { name: /walk through the memories/i }).click()
  await expect(page.getByRole('status')).toContainText('Wall 1 of 3')
  await page.getByRole('button', { name: 'Read tribute from Susan Whitfield' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(horizontalOverflow)).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Close tribute' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('mobile: tribute list and detail pages do not overflow horizontally', async ({ page }) => {
  await mockApi(page)

  await page.goto('/tributes')
  await expect(page.getByRole('heading', { name: /words from those who loved her/i })).toBeVisible()
  expect(await page.evaluate(horizontalOverflow)).toBeLessThanOrEqual(0)
  // Long names must not widen the tribute grid past the viewport.
  const cardWiderThanViewport = await page.evaluate(() => {
    const vw = window.innerWidth
    return [...document.querySelectorAll('article.card')].some((el) => el.getBoundingClientRect().width > vw - 8)
  })
  expect(cardWiderThanViewport).toBe(false)

  await page.goto('/tributes/t-child')
  await expect(page.getByRole('heading', { name: 'Susan Whitfield' })).toBeVisible()
  expect(await page.evaluate(horizontalOverflow)).toBeLessThanOrEqual(0)

  await page.getByRole('link', { name: /all tributes/i }).click()
  await expect(page).toHaveURL(/\/tributes$/)
  await page.getByRole('button', { name: /read more: tribute from susan whitfield/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(horizontalOverflow)).toBeLessThanOrEqual(0)
})
