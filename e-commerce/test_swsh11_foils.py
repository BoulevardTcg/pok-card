#!/usr/bin/env python3
"""
Script pour tester réellement les URLs de foils SWSH11 sur le CDN
et ne garder que celles qui existent (incluant les VMAX).
"""

import json
import requests
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

def test_url_exists(url, timeout=3):
    """Teste si une URL existe en faisant une requête HEAD."""
    try:
        response = requests.head(url, timeout=timeout)
        return response.status_code == 200
    except:
        return False

def generate_test_urls_for_swsh11():
    """Génère toutes les URLs possibles pour tester (incluant VMAX)."""
    test_urls = {}
    
    # Variants de foils à tester
    variants = [
        "foil_etched_swsecret", "foil_etched_sunpillar", "foil_etched_radiantholo",
        "foil_fullart", "foil_alt", "foil_swsecret", "foil_holo_rainbow",
        "foil_holo_swholo", "foil_holo_cosmos", "foil_holo_reverse",
        "foil_etched", "foil_holo", "foil"
    ]
    
    # Générer les URLs pour toutes les cartes SWSH11 (001-217)
    for card_num in range(1, 218):
        num_str = f"{card_num:03d}"
        test_urls[num_str] = []
        
        for variant in variants:
            url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{num_str}_{variant}_2x.webp"
            test_urls[num_str].append((url, variant))
    
    # Ajouter les cartes TG (Trainer Gallery)
    tg_cards = ["TG01", "TG02", "TG03", "TG04", "TG05", "TG06", "TG07", "TG08", "TG09", "TG10", "TG11", 
                "TG12", "TG13", "TG14", "TG15", "TG16", "TG17", "TG18", "TG19", "TG20", "TG21", "TG22", 
                "TG23", "TG24", "TG25", "TG26", "TG27", "TG28", "TG29", "TG30"]
    
    for tg_num in tg_cards:
        test_urls[tg_num] = []
        for variant in variants:
            url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{tg_num}_{variant}_2x.webp"
            test_urls[tg_num].append((url, variant))
    
    # Ajouter les cartes VMAX (elles ont souvent des numéros différents)
    vmax_cards = []
    
    # VMAX connues dans SWSH11 (basé sur la structure typique)
    # Générer des numéros VMAX possibles
    for card_num in range(1, 218):
        # Format VMAX typique : numéro original + suffixe ou numéro séparé
        vmax_cards.extend([
            f"{card_num:03d}_vmax",  # Format avec suffixe
            f"vmax_{card_num:03d}",  # Format avec préfixe
            f"{card_num:03d}vmax",   # Format sans underscore
        ])
    
    # Ajouter des numéros VMAX spécifiques connus
    specific_vmax = ["VMAX01", "VMAX02", "VMAX03", "VMAX04", "VMAX05", "VMAX06", "VMAX07", "VMAX08", "VMAX09", "VMAX10"]
    vmax_cards.extend(specific_vmax)
    
    # Ajouter des numéros VMAX dans la plage 200-250 (zone typique pour VMAX)
    for card_num in range(200, 251):
        vmax_cards.append(f"{card_num:03d}")
    
    # Tester les URLs VMAX
    for vmax_num in vmax_cards:
        if vmax_num not in test_urls:  # Éviter les doublons
            test_urls[vmax_num] = []
            for variant in variants:
                url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{vmax_num}_{variant}_2x.webp"
                test_urls[vmax_num].append((url, variant))
    
    return test_urls

def test_url_batch(url_batch):
    """Teste un lot d'URLs et retourne celles qui existent."""
    results = {}
    for number, urls in url_batch.items():
        for url, variant in urls:
            if test_url_exists(url):
                results[number] = {
                    "foil_url": url,
                    "foil_variant": variant
                }
                print(f"✅ {number}: {variant}")
                break  # On prend le premier qui fonctionne
        else:
            print(f"❌ {number}: Aucun foil trouvé")
    return results

def find_working_foils():
    """Trouve tous les foils SWSH11 qui existent réellement (incluant VMAX)."""
    print("🔍 Génération des URLs à tester (incluant VMAX)...")
    test_urls = generate_test_urls_for_swsh11()
    
    print(f"🔗 {len(test_urls)} cartes à tester")
    print(f"🔗 {sum(len(urls) for urls in test_urls.values())} URLs totales")
    
    # Diviser en lots pour le multithreading
    batch_size = 20
    batches = {}
    current_batch = {}
    
    for number, urls in test_urls.items():
        current_batch[number] = urls
        if len(current_batch) >= batch_size:
            batches[len(batches)] = current_batch
            current_batch = {}
    
    if current_batch:
        batches[len(batches)] = current_batch
    
    print(f"📦 {len(batches)} lots créés pour le test parallèle")
    
    # Tester en parallèle
    working_foils = {}
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_batch = {executor.submit(test_url_batch, batch): batch for batch in batches.values()}
        
        for future in as_completed(future_to_batch):
            batch_results = future.result()
            working_foils.update(batch_results)
            time.sleep(0.1)  # Petite pause pour ne pas surcharger le CDN
    
    return working_foils

def update_fr_enriched_with_working_foils():
    """Met à jour fr_enriched.json avec seulement les foils qui fonctionnent."""
    
    print("🚀 Recherche des foils SWSH11 fonctionnels (incluant VMAX)...")
    working_foils = find_working_foils()
    
    print(f"\n🎯 {len(working_foils)} foils fonctionnels trouvés !")
    
    # Charger fr_enriched.json
    fr_enriched_path = Path("pokecard/public/foils/fr_enriched.json")
    
    try:
        with open(fr_enriched_path, 'r', encoding='utf-8') as f:
            fr_enriched = json.load(f)
    except Exception as e:
        print(f"❌ Erreur lors du chargement de fr_enriched.json: {e}")
        return
    
    # Mettre à jour avec seulement les foils qui fonctionnent
    updated_count = 0
    
    for entry in fr_enriched:
        set_code = entry.get('setCode', '').lower()
        number = entry.get('number', '')
        
        if set_code == 'swsh11' and number in working_foils:
            entry['_foil_url'] = working_foils[number]['foil_url']
            entry['_foil_variant'] = working_foils[number]['foil_variant']
            entry['_foil_found'] = True
            updated_count += 1
        elif set_code == 'swsh11':
            # Supprimer les foils qui ne fonctionnent pas
            entry.pop('_foil_url', None)
            entry.pop('_foil_variant', None)
            entry.pop('_foil_found', None)
    
    # Sauvegarder
    try:
        with open(fr_enriched_path, 'w', encoding='utf-8') as f:
            json.dump(fr_enriched, f, ensure_ascii=False, indent=2)
        print(f"✅ fr_enriched.json mis à jour avec {updated_count} foils fonctionnels")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {e}")
    
    # Afficher quelques exemples
    print(f"\n📋 Exemples de foils fonctionnels:")
    examples = list(working_foils.items())[:15]
    for number, foil_data in examples:
        print(f"   • {number}: {foil_data['foil_variant']}")
    
    # Compter les VMAX trouvées
    vmax_count = sum(1 for number in working_foils.keys() if 'vmax' in number.lower() or number.startswith('VMAX'))
    print(f"\n🎯 VMAX avec foils: {vmax_count}")

if __name__ == "__main__":
    print("🔍 Test des URLs de foils SWSH11 sur le CDN (incluant VMAX)")
    print("=" * 70)
    
    update_fr_enriched_with_working_foils()
    
    print("\n✅ Test terminé !")
    print("🔄 Rechargez votre application pour voir les vrais foils (incluant VMAX).")
