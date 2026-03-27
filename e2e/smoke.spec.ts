import { test, expect } from '@playwright/test';

test.describe('Parcours principaux', () => {
  test('Accueil vers login syndic', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /acces syndic/i }).first().click();
    await expect(page).toHaveURL(/\/syndic\/login$/);
    await expect(page.getByRole('heading', { name: /portail/i })).toBeVisible();
  });

  test('Page Cachets accessible', async ({ page }) => {
    await page.goto('/cachets');
    await expect(page.getByRole('heading', { name: /cachet pour votre entreprise/i })).toBeVisible();
  });

  test('Inscription syndic accessible', async ({ page }) => {
    await page.goto('/syndic/register');
    await expect(page.getByText(/inscription/i)).toBeVisible();
  });

  test('Mot de passe oublie accessible', async ({ page }) => {
    await page.goto('/syndic/forgot');
    await expect(page.getByText(/mot de passe/i)).toBeVisible();
  });

  test('Reset sans token renvoie vers erreur dediee', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(/invalide/i)).toBeVisible();
  });

  test('Route inconnue renvoie 404 custom', async ({ page }) => {
    await page.goto('/page-introuvable');
    await expect(page.getByText(/page introuvable/i)).toBeVisible();
  });
});
