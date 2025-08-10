#!/usr/bin/env python3
"""
Script pour générer des URLs de foils V-Star pour le CDN poke-holo
"""

import json
import re
from typing import Dict, List, Optional

def extract_vstar_cards_from_json(json_file_path: str) -> List[Dict]:
    """Extrait les cartes V-Star du fichier JSON enrichi"""
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Erreur lors de la lecture de {json_file_path}: {e}")
        return []
    
    vstar_cards = []
    
    for card in data:
        # Vérifier si c'est une carte V-Star
        if (isinstance(card, dict) and 
            card.get('rarity') == 'Holo Rare VSTAR' and
            'VSTAR' in card.get('name', '')):
            
            vstar_cards.append({
                'name': card.get('name', ''),
                'setCode': card.get('setCode', ''),
                'number': card.get('number', ''),
                'rarity': card.get('rarity', ''),
                'setSeries': card.get('setSeries', '')
            })
    
    return vstar_cards

def generate_vstar_foil_url(set_code: str, number: str) -> str:
    """Génère l'URL du foil V-Star basée sur le pattern CDN"""
    # Pattern: https://poke-holo.b-cdn.net/foils/{setCode}/foils/upscaled/{number}_foil_vstar_2x.webp
    
    # Nettoyer le set_code (enlever les espaces, convertir en minuscules)
    clean_set = re.sub(r'[^a-zA-Z0-9]', '', set_code.lower())
    
    # Nettoyer le numéro (enlever les espaces, padding à 3 chiffres si nécessaire)
    clean_number = re.sub(r'[^0-9]', '', str(number))
    if clean_number.isdigit():
        clean_number = clean_number.zfill(3)
    
    foil_url = f"https://poke-holo.b-cdn.net/foils/{clean_set}/foils/upscaled/{clean_number}_foil_vstar_2x.webp"
    return foil_url

def create_vstar_foil_mapping(vstar_cards: List[Dict]) -> List[Dict]:
    """Crée le mapping des foils V-Star avec les URLs générées"""
    foil_mapping = []
    
    for card in vstar_cards:
        foil_url = generate_vstar_foil_url(card['setCode'], card['number'])
        
        foil_entry = {
            'name': card['name'],
            'setCode': card['setCode'],
            'number': card['number'],
            'rarity': card['rarity'],
            'setSeries': card['setSeries'],
            '_foil_url': foil_url,
            '_foil_variant': 'vstar'
        }
        
        foil_mapping.append(foil_entry)
    
    return foil_mapping

def save_vstar_foils(foil_mapping: List[Dict], output_file: str = 'vstar_foils.json'):
    """Sauvegarde le mapping des foils V-Star dans un fichier JSON"""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(foil_mapping, f, ensure_ascii=False, indent=2)
        print(f"✅ Mapping des foils V-Star sauvegardé dans {output_file}")
        print(f"📊 {len(foil_mapping)} cartes V-Star traitées")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {e}")

def main():
    """Fonction principale"""
    print("🎯 Génération des foils V-Star pour le CDN poke-holo")
    print("=" * 60)
    
    # Chemin vers le fichier JSON enrichi
    json_file = 'pokecard/public/foils/fr_enriched_with_swsh11_urls.json'
    
    print(f"📁 Lecture du fichier: {json_file}")
    
    # Extraire les cartes V-Star
    vstar_cards = extract_vstar_cards_from_json(json_file)
    
    if not vstar_cards:
        print("❌ Aucune carte V-Star trouvée")
        return
    
    print(f"🎴 {len(vstar_cards)} cartes V-Star trouvées")
    
    # Afficher quelques exemples
    print("\n📋 Exemples de cartes V-Star trouvées:")
    for i, card in enumerate(vstar_cards[:5]):
        print(f"  {i+1}. {card['name']} ({card['setCode']} #{card['number']})")
    
    if len(vstar_cards) > 5:
        print(f"  ... et {len(vstar_cards) - 5} autres")
    
    # Générer le mapping des foils
    print("\n🔗 Génération des URLs de foils...")
    foil_mapping = create_vstar_foil_mapping(vstar_cards)
    
    # Afficher quelques exemples d'URLs
    print("\n🌐 Exemples d'URLs de foils générées:")
    for i, entry in enumerate(foil_mapping[:3]):
        print(f"  {i+1}. {entry['name']}: {entry['_foil_url']}")
    
    # Sauvegarder le mapping
    print("\n💾 Sauvegarde du mapping...")
    save_vstar_foils(foil_mapping)
    
    print("\n🎉 Génération terminée !")
    print("\n📝 Prochaines étapes:")
    print("  1. Vérifier que les URLs générées sont valides")
    print("  2. Intégrer ce mapping dans le système de foils existant")
    print("  3. Modifier le CSS V-Star pour utiliser ces foils")

if __name__ == "__main__":
    main()
