import { test, expect } from '@playwright/test';

/**
 * CI-safe UI smoke — API/DB tələb etmir (yalnız Next static/SSR shell).
 * Tam marketplace smoke üçün: `e2e/smoke.spec.ts` (lokal stack).
 */
test.describe('CI auth UI', () => {
  test('ana səhifə brend göstərir', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(/Xidmətal/i).first()).toBeVisible();
  });

  test('login formu mövcuddur', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: /Giriş|Daxil ol/i }).first()).toBeVisible();
    await expect(page.getByLabel(/E-poçt|Email/i).first()).toBeVisible();
    await expect(page.getByLabel(/Şifrə/i).first()).toBeVisible();
  });

  test('qeydiyyat formu mövcuddur', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole('heading', { name: /Qeydiyyat|Hesab yarat/i }).first(),
    ).toBeVisible();
  });

  test('şifrə unutma səhifəsi açılır', async ({ page }) => {
    const response = await page.goto('/forgot-password');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(/şifrə|bərpa/i).first()).toBeVisible();
  });

  test('sifariş detal kabineti giriş tələb edir', async ({ page }) => {
    await page.goto('/dashboard/customer/bookings/00000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('xidmət verən sifariş detalı giriş tələb edir', async ({ page }) => {
    await page.goto('/dashboard/provider/bookings/00000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
