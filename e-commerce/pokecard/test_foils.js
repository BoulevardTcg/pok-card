// Test simple pour vérifier le chargement des foils SWSH11
async function testFoilLoading() {
  try {
    const response = await fetch('/foils/fr_enriched_with_swsh11_urls.json');
    if (!response.ok) {
      console.error('❌ Erreur lors du chargement du fichier:', response.status);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Fichier chargé avec succès');
    console.log('📊 Nombre total d\'entrées:', data.length);
    
    // Chercher les entrées SWSH11 avec des foils
    const swsh11WithFoils = data.filter(entry => 
      entry.setCode === 'swsh11' && 
      entry.foil_url && 
      entry.foil_url.trim() !== ''
    );
    
    console.log('🎴 Nombre de cartes SWSH11 avec foils:', swsh11WithFoils.length);
    
    // Afficher quelques exemples
    if (swsh11WithFoils.length > 0) {
      console.log('📋 Exemples de foils SWSH11:');
      swsh11WithFoils.slice(0, 5).forEach(entry => {
        console.log(`  ${entry.number}: ${entry.foil_url}`);
      });
    }
    
    // Vérifier la structure des clés
    const sampleEntry = swsh11WithFoils[0];
    if (sampleEntry) {
      console.log('🔑 Structure d\'une entrée:', {
        setCode: sampleEntry.setCode,
        number: sampleEntry.number,
        foil_url: sampleEntry.foil_url,
        has_foil_url: !!sampleEntry.foil_url,
        has_foil_variant: !!sampleEntry.foil_variant
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Lancer le test
testFoilLoading();
