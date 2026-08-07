import { test, expect } from '@playwright/test';

/**
 * Kritik marketplace səhifələri — auth formları və əsas axın giriş nöqtələri.
 * Tam API axını (register→book) seed + SMTP tələb edir; burada UI contract yoxlanır.
 */
test.describe('Kritik axınlar (UI)', () => {
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

  test('xidmət detallarına keçid mümkündür', async ({ page }) => {
    await page.goto('/services');
    const firstLink = page.locator('a[href^="/services/"]').first();
    const count = await firstLink.count();
    test.skip(count === 0, 'Kataloqda xidmət yoxdur');
    await firstLink.click();
    await expect(page).toHaveURL(/\/services\/.+/);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
