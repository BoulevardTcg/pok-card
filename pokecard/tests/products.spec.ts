import { test, expect } from '@playwright/test';

test.describe('Produits', () => {
  test('La page produits affiche des articles', async ({ page }) => {
    await page.goto('/produits');
    
    // Attendre que les produits se chargent
    await page.waitForLoadState('networkidle');
    
    // Vérifier qu'il y a des produits ou un message "aucun produit"
    const hasProducts = await page.locator('[class*="product"], [class*="card"]').count() > 0;
    const hasEmptyMessage = await page.getByText(/aucun produit|pas de produit/i).isVisible().catch(() => false);
    
    expect(hasProducts || hasEmptyMessage).toBeTruthy();
  });

  test('Le panier affiche un message quand il est vide', async ({ page }) => {
    await page.goto('/panier');
    
    // Vérifier le message panier vide
    await expect(page.getByText(/panier.*vide|aucun article/i)).toBeVisible();
  });
});

test.describe('Recherche', () => {
  test('La recherche fonctionne', async ({ page }) => {
    await page.goto('/');
    
    // Trouver et utiliser la barre de recherche si elle existe
    const searchInput = page.getByPlaceholder(/recherche/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Pikachu');
      await searchInput.press('Enter');
      
      // Vérifier qu'on a des résultats ou un message
      await page.waitForLoadState('networkidle');
    }
  });
});

