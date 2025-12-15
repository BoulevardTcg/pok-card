import { test, expect } from '@playwright/test';

test.describe('Authentification', () => {
  test('Affiche la page de connexion', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mot de passe/i)).toBeVisible();
  });

  test('Affiche une erreur avec des identifiants invalides', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder(/email/i).fill('test@invalid.com');
    await page.getByPlaceholder(/mot de passe/i).fill('wrongpassword');
    await page.getByRole('button', { name: /connexion/i }).click();
    
    // Attendre le message d'erreur
    await expect(page.getByText(/erreur|invalide/i)).toBeVisible({ timeout: 5000 });
  });

  test('Affiche la page d\'inscription', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.getByRole('heading', { name: /inscription|créer/i })).toBeVisible();
  });
});

