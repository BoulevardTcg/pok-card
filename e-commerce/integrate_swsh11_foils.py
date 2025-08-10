#!/usr/bin/env python3
"""
Script pour intégrer automatiquement les URLs de foils SWSH11 du CDN
dans fr_enriched.json en utilisant temp_swsh11.json comme source de données.
"""

import json
import os
from pathlib import Path

def load_json_file(filepath):
    """Charge un fichier JSON."""
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(filepath, 'r', encoding=encoding) as f:
                content = f.read()
                if content.strip():  # Vérifier que le contenu n'est pas vide
                    return json.loads(content)
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Erreur lors du chargement de {filepath} avec {encoding}: {e}")
            continue
    
    # Essayer en mode binaire si tous les encodages échouent
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
            # Essayer de décoder en UTF-8
            text_content = content.decode('utf-8', errors='ignore')
            if text_content.strip():
                return json.loads(text_content)
    except Exception as e:
        print(f"Erreur lors du chargement binaire de {filepath}: {e}")
    
    print(f"❌ Impossible de charger {filepath} avec aucun encodage")
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
    
    # Générer les URLs pour toutes les cartes SWSH11
    for card_num in range(1, 218):  # SWSH11 va de 001 à 217
        num_str = f"{card_num:03d}"
        
        # Tester chaque variant
        for variant in variants:
            url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{num_str}_{variant}_2x.webp"
            foil_urls[num_str] = {
                "foil_url": url,
                "foil_variant": variant
            }
            break  # On prend le premier variant trouvé
    
    # Ajouter les cartes TG (Trainer Gallery)
    tg_cards = ["TG01", "TG02", "TG03", "TG04", "TG05", "TG06", "TG07", "TG08", "TG09", "TG10", "TG11", 
                "TG12", "TG13", "TG14", "TG15", "TG16", "TG17", "TG18", "TG19", "TG20", "TG21", "TG22", 
                "TG23", "TG24", "TG25", "TG26", "TG27", "TG28", "TG29", "TG30"]
    
    for tg_num in tg_cards:
        for variant in variants:
            url = f"https://poke-holo.b-cdn.net/foils/swsh11/foils/upscaled/{tg_num}_{variant}_2x.webp"
            foil_urls[tg_num] = {
                "foil_url": url,
                "foil_variant": variant
            }
            break
    
    return foil_urls

def integrate_foils_into_fr_enriched():
    """Intègre les foils SWSH11 dans fr_enriched.json."""
    
    # Chemins des fichiers
    temp_swsh11_path = Path("temp_swsh11.json")
    fr_enriched_path = Path("pokecard/public/foils/fr_enriched.json")
    
    # Charger les données
    print("📂 Chargement des fichiers...")
    swsh11_cards = load_json_file(temp_swsh11_path)
    fr_enriched = load_json_file(fr_enriched_path)
    
    if not swsh11_cards or not fr_enriched:
        print("❌ Impossible de charger les fichiers requis")
        return
    
    print(f"📊 {len(swsh11_cards)} cartes SWSH11 trouvées")
    print(f"📊 {len(fr_enriched)} cartes dans fr_enriched.json")
    
    # Générer les URLs de foils
    print("🔗 Génération des URLs de foils...")
    foil_urls = generate_foil_urls_for_swsh11()
    
    # Créer un mapping des cartes SWSH11
    swsh11_mapping = {}
    for card in swsh11_cards:
        card_id = card.get('id', '')
        if card_id.startswith('swsh11-'):
            number = card.get('number', '')
            swsh11_mapping[number] = card
    
    print(f"🗂️ {len(swsh11_mapping)} cartes SWSH11 mappées")
    
    # Intégrer les foils dans fr_enriched
    updated_count = 0
    new_cards_added = 0
    
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
    
    # Ajouter les cartes SWSH11 manquantes
    for number, card_data in swsh11_mapping.items():
        # Vérifier si la carte existe déjà dans fr_enriched
        exists = any(
            entry.get('setCode', '').lower() == 'swsh11' and 
            entry.get('number', '') == number 
            for entry in fr_enriched
        )
        
        if not exists and number in foil_urls:
            # Créer une nouvelle entrée
            new_entry = {
                'setCode': 'swsh11',
                'number': number,
                '_meta': {
                    'name': card_data.get('name', ''),
                    'rarity': card_data.get('rarity', '')
                },
                '_foil_url': foil_urls[number]['foil_url'],
                '_foil_variant': foil_urls[number]['foil_variant'],
                '_foil_found': True
            }
            fr_enriched.append(new_entry)
            new_cards_added += 1
    
    # Sauvegarder les modifications
    print(f"💾 Sauvegarde des modifications...")
    print(f"📝 {updated_count} cartes existantes mises à jour")
    print(f"➕ {new_cards_added} nouvelles cartes ajoutées")
    
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
    print(f"   • Nouvelles cartes ajoutées: {new_cards_added}")

if __name__ == "__main__":
    print("🚀 Intégration des foils SWSH11 dans fr_enriched.json")
    print("=" * 60)
    
    integrate_foils_into_fr_enriched()
    
    print("\n✅ Intégration terminée !")
    print("🔄 Rechargez votre application pour voir les nouveaux foils.")
