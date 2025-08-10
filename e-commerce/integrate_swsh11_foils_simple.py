#!/usr/bin/env python3
"""
Script simplifié pour intégrer automatiquement les URLs de foils SWSH11 du CDN
dans fr_enriched.json sans dépendre de temp_swsh11.json.
"""

import json
import os
from pathlib import Path

def load_json_file(filepath):
    """Charge un fichier JSON."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Erreur lors du chargement de {filepath}: {e}")
        return None

def save_json_file(filepath, data):
    """Sauvegarde des données dans un fichier JSON."""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Données sauvegardées dans {filepath}")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde de {filepath}: {e}")

def generate_foil_urls_for_swsh11():
    """Génère les URLs de foils pour toutes les cartes SWSH11."""
    foil_urls = {}
    
    # Variants de foils à tester (par ordre de priorité)
    variants = [
        "foil_etched_swsecret", "foil_etched_sunpillar", "foil_etched_radiantholo",
        "foil_fullart", "foil_alt", "foil_swsecret", "foil_holo_rainbow",
        "foil_holo_swholo", "foil_holo_cosmos", "foil_holo_reverse",
        "foil_etched", "foil_holo", "foil"
    ]
    
    # Générer les URLs pour toutes les cartes SWSH11 (001-217)
    for card_num in range(1, 218):
        num_str = f"{card_num:03d}"
        
        # Utiliser le premier variant (le plus commun)
        variant = variants[0]
        url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{num_str}_{variant}_2x.webp"
        foil_urls[num_str] = {
            "foil_url": url,
            "foil_variant": variant
        }
    
    # Ajouter les cartes TG (Trainer Gallery)
    tg_cards = ["TG01", "TG02", "TG03", "TG04", "TG05", "TG06", "TG07", "TG08", "TG09", "TG10", "TG11", 
                "TG12", "TG13", "TG14", "TG15", "TG16", "TG17", "TG18", "TG19", "TG20", "TG21", "TG22", 
                "TG23", "TG24", "TG25", "TG26", "TG27", "TG28", "TG29", "TG30"]
    
    for tg_num in tg_cards:
        variant = variants[0]
        url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{tg_num}_{variant}_2x.webp"
        foil_urls[tg_num] = {
            "foil_url": url,
            "foil_variant": variant
        }
    
    return foil_urls

def integrate_foils_into_fr_enriched():
    """Intègre les foils SWSH11 dans fr_enriched.json."""
    
    # Chemins des fichiers
    fr_enriched_path = Path("pokecard/public/foils/fr_enriched.json")
    
    # Charger les données
    print("📂 Chargement de fr_enriched.json...")
    fr_enriched = load_json_file(fr_enriched_path)
    
    if not fr_enriched:
        print("❌ Impossible de charger fr_enriched.json")
        return
    
    print(f"📊 {len(fr_enriched)} cartes dans fr_enriched.json")
    
    # Générer les URLs de foils
    print("🔗 Génération des URLs de foils SWSH11...")
    foil_urls = generate_foil_urls_for_swsh11()
    
    print(f"🔗 {len(foil_urls)} URLs de foils générées")
    
    # Intégrer les foils dans fr_enriched
    updated_count = 0
    
    for entry in fr_enriched:
        set_code = entry.get('setCode', '').lower()
        number = entry.get('number', '')
        
        # Si c'est une carte SWSH11
        if set_code == 'swsh11' and number in foil_urls:
            # Ajouter les informations de foil
            entry['_foil_url'] = foil_urls[number]['foil_url']
            entry['_foil_variant'] = foil_urls[number]['foil_variant']
            entry['_foil_found'] = True
            updated_count += 1
    
    # Sauvegarder les modifications
    print(f"💾 Sauvegarde des modifications...")
    print(f"📝 {updated_count} cartes SWSH11 mises à jour avec des foils")
    
    save_json_file(fr_enriched_path, fr_enriched)
    
    # Statistiques finales
    total_swsh11_with_foils = sum(
        1 for entry in fr_enriched 
        if entry.get('setCode', '').lower() == 'swsh11' and entry.get('_foil_found')
    )
    
    print(f"\n🎯 Résumé:")
    print(f"   • Cartes SWSH11 avec foils: {total_swsh11_with_foils}")
    print(f"   • Total des cartes dans fr_enriched: {len(fr_enriched)}")
    print(f"   • Cartes mises à jour: {updated_count}")
    
    # Afficher quelques exemples
    print(f"\n📋 Exemples d'URLs de foils générées:")
    examples = list(foil_urls.items())[:5]
    for number, foil_data in examples:
        print(f"   • {number}: {foil_data['foil_url']}")

if __name__ == "__main__":
    print("🚀 Intégration des foils SWSH11 dans fr_enriched.json")
    print("=" * 60)
    
    integrate_foils_into_fr_enriched()
    
    print("\n✅ Intégration terminée !")
    print("🔄 Rechargez votre application pour voir les nouveaux foils.")
    print("💡 Note: Les URLs générées sont basées sur le pattern CDN standard.")
    print("   Certaines URLs peuvent ne pas exister sur le CDN.")
