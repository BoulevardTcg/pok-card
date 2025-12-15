import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('La page d\'accueil se charge correctement', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que le header est présent
    await expect(page.locator('header')).toBeVisible();
    
    // Vérifier que la page contient du contenu
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Navigation vers la page Pokémon', async ({ page }) => {
    await page.goto('/');
    
    // Cliquer sur le lien Pokémon
    await page.getByRole('link', { name: /pokémon/i }).first().click();
    
    // Vérifier la navigation
    await expect(page).toHaveURL(/pokemon/i);
  });

  test('Navigation vers la page One Piece', async ({ page }) => {
    await page.goto('/');
    
    // Cliquer sur le lien One Piece
    await page.getByRole('link', { name: /one piece/i }).first().click();
    
    // Vérifier la navigation
    await expect(page).toHaveURL(/one-piece/i);
  });

  test('Navigation vers le panier', async ({ page }) => {
    await page.goto('/');
    
    // Cliquer sur l'icône du panier
    await page.getByRole('link', { name: /panier/i }).click();
    
    // Vérifier la navigation
    await expect(page).toHaveURL(/panier|cart/i);
  });
});

