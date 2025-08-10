#!/usr/bin/env python3
"""
Script de test pour vérifier les foils V-Star et leur mapping
"""

import json

def test_vstar_foils():
    """Teste la détection des foils V-Star et leur mapping"""
    
    # Chemin vers le fichier JSON enrichi
    json_file = 'pokecard/public/foils/fr_enriched_with_swsh11_urls.json'
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Erreur lors de la lecture: {e}")
        return
    
    print("🎯 Test des foils V-Star et leur mapping")
    print("=" * 60)
    
    vstar_cards = []
    
    for card in data:
        # Détecter les V-Star par leur nom (plus fiable que la rareté)
        if (isinstance(card, dict) and 
            'VSTAR' in card.get('name', '')):
            
            # Vérifier si la carte a un foil
            foil_url = card.get('foil_url') or card.get('_foil_url')
            foil_variant = card.get('foil_variant') or card.get('_foil_variant')
            set_code = card.get('setCode', '')
            number = card.get('number', '')
            rarity = card.get('rarity', '')
            
            vstar_cards.append({
                'name': card.get('name', ''),
                'setCode': set_code,
                'number': number,
                'rarity': rarity,
                'foil_url': foil_url,
                'foil_variant': foil_variant,
                'mapping_key': f"{set_code.lower()}|{number}" if set_code and number else None
            })
    
    print(f"📊 {len(vstar_cards)} cartes V-Star trouvées")
    
    # Afficher les 15 premières avec leurs foils
    print("\n🔍 Premières cartes V-Star avec leurs foils:")
    for i, card in enumerate(vstar_cards[:15]):
        status = "✅" if card['foil_url'] else "❌"
        print(f"  {i+1}. {status} {card['name']} ({card['setCode']} #{card['number']})")
        print(f"     🎭 Rareté: {card['rarity']}")
        if card['foil_url']:
            print(f"     🌟 Foil: {card['foil_url']}")
            print(f"     🎨 Variant: {card['foil_variant']}")
            print(f"     🔑 Mapping key: {card['mapping_key']}")
        else:
            print(f"     ⚠️  Pas de foil trouvé")
        print()
    
    # Statistiques des foils
    with_foil = sum(1 for card in vstar_cards if card['foil_url'])
    without_foil = len(vstar_cards) - with_foil
    
    print(f"📈 Statistiques:")
    print(f"   ✅ Avec foil: {with_foil}")
    print(f"   ❌ Sans foil: {without_foil}")
    print(f"   📊 Taux de couverture: {(with_foil/len(vstar_cards)*100):.1f}%")
    
    # Vérifier les variants de foils
    variants = {}
    for card in vstar_cards:
        if card['foil_variant']:
            variant = card['foil_variant']
            variants[variant] = variants.get(variant, 0) + 1
    
    if variants:
        print(f"\n🎨 Variants de foils trouvés:")
        for variant, count in sorted(variants.items()):
            print(f"   {variant}: {count} cartes")
    
    # Vérifier les raretés
    rarities = {}
    for card in vstar_cards:
        rarity = card['rarity']
        rarities[rarity] = rarities.get(rarity, 0) + 1
    
    if rarities:
        print(f"\n🏷️  Raretés des V-Star:")
        for rarity, count in sorted(rarities.items()):
            print(f"   {rarity}: {count} cartes")
    
    # Test du mapping
    print(f"\n🔑 Test du mapping:")
    print(f"   Format attendu: setCode|number (ex: swsh11|057)")
    
    # Vérifier quelques exemples de mapping
    examples = []
    for card in vstar_cards[:5]:
        if card['mapping_key'] and card['foil_url']:
            examples.append({
                'key': card['mapping_key'],
                'foil': card['foil_url'],
                'name': card['name']
            })
    
    if examples:
        print(f"   Exemples de mapping:")
        for ex in examples:
            print(f"     {ex['key']} → {ex['name']}")
            print(f"        {ex['foil']}")
    else:
        print(f"   ⚠️  Aucun exemple de mapping valide trouvé")

if __name__ == "__main__":
    test_vstar_foils()
