import { test, expect } from '@playwright/test';

/**
 * Smoke E2E — işləyən marketplace tələb edir:
 *   E2E_BASE_URL=http://localhost:3020 pnpm --filter @xidmetal/web test:e2e
 */
test.describe('Marketplace smoke', () => {
  test('ana səhifə brend siqnalı göstərir', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(/Xidmətal/i).first()).toBeVisible();
  });

  test('xidmətlər səhifəsi açılır', async ({ page }) => {
    const response = await page.goto('/services');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: /Xidmətlər|Axtarış/i }).first()).toBeVisible();
  });

  test('əlaqə formu mövcuddur', async ({ page }) => {
    const response = await page.goto('/contact');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: /Bizə yazın|Əlaqə/i }).first()).toBeVisible();
  });
});
