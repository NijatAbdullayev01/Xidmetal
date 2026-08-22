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

  test('sifariş detal kabineti giriş tələb edir', async ({ page }) => {
    await page.goto('/dashboard/customer/bookings/00000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('xidmət verən sifariş detalı giriş tələb edir', async ({ page }) => {
    await page.goto('/dashboard/provider/bookings/00000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('xidmət kartı preview pop-up açır', async ({ page }) => {
    await page.goto('/services');
    const firstCard = page
      .getByRole('button', { name: /şəkillər və təsvir/i })
      .first();
    const count = await firstCard.count();
    test.skip(count === 0, 'Kataloqda xidmət yoxdur');
    await firstCard.click();
    await expect(page).toHaveURL(/\/services\/?$/);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
