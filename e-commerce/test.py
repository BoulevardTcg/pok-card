import argparse
import json
import sys
import time
from pathlib import Path
from typing import List, Optional, Dict, Any
import requests

CDN_BASE = "https://poke-holo.b-cdn.net/foils"

# Variants connus
VARIANTS: List[str] = [
    "foil_etched_swsecret",
    "foil_etched",
    "foil_fullart",
    "foil_alt",
    "foil_swsecret",
    "foil",
]

def load_cards(filename: str) -> List[Dict[str, Any]]:
    try:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise SystemExit(f"Error reading JSON input {filename}: {exc}") from exc

    cards: List[Dict[str, Any]] = []
    for idx, entry in enumerate(data):
        try:
            set_code = str(entry.get("setCode") or entry["set"]).strip()
            number = str(entry["number"]).strip()
        except KeyError as exc:
            raise SystemExit(f"Missing key {exc} in card entry at index {idx}") from exc
        cards.append({"setCode": set_code, "number": number})
    return cards

def find_variant_url(set_code: str, number: str, variants: List[str], timeout: float) -> Optional[str]:
    for variant in variants:
        url = f"{CDN_BASE}/{set_code}/foils/upscaled/{number}_{variant}_2x.webp"
        try:
            res = requests.head(url, timeout=timeout)
        except Exception as exc:
            print(f"HEAD request error for {url}: {exc}", file=sys.stderr)
            continue
        if res.status_code == 200:
            return variant
    return None

def download_foil(set_code: str, number: str, variant: str, out_dir: Path, timeout: float) -> bool:
    url = f"{CDN_BASE}/{set_code}/foils/upscaled/{number}_{variant}_2x.webp"
    try:
        res = requests.get(url, timeout=timeout)
    except Exception as exc:
        print(f"GET request error for {url}: {exc}", file=sys.stderr)
        return False
    if res.status_code != 200:
        print(f"Failed to download {url}: HTTP {res.status_code}", file=sys.stderr)
        return False

    card_dir = out_dir / set_code
    card_dir.mkdir(parents=True, exist_ok=True)
    file_path = card_dir / f"{number}.webp"
    try:
        with open(file_path, "wb") as f:
            f.write(res.content)
        return True
    except Exception as exc:
        print(f"Error writing file {file_path}: {exc}", file=sys.stderr)
        return False

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Download Pokémon foil images from poke-holo CDN.")
    parser.add_argument("cards_json", help="Path to JSON file with list of {setCode, number} objects.")
    parser.add_argument("--out", dest="out", default="public/foils", help="Base output directory (default: public/foils)")
    parser.add_argument("--sleep", type=float, default=0.05, help="Sleep duration between requests")
    parser.add_argument("--head-timeout", type=float, default=5.0, help="Timeout for HEAD requests")
    parser.add_argument("--get-timeout", type=float, default=10.0, help="Timeout for GET requests")
    args = parser.parse_args(argv)

    cards = load_cards(args.cards_json)
    out_dir = Path(args.out)

    total = len(cards)
    downloaded = 0
    for idx, card in enumerate(cards, 1):
        set_code = card["setCode"]
        number = card["number"]
        variant = find_variant_url(set_code, number, VARIANTS, args.head_timeout)
        if variant is None:
            print(f"[{idx}/{total}] No foil found for {set_code}/{number}")
        else:
            ok = download_foil(set_code, number, variant, out_dir, args.get_timeout)
            if ok:
                downloaded += 1
                print(f"[{idx}/{total}] Downloaded {set_code}/{number} ({variant})")
            else:
                print(f"[{idx}/{total}] Failed to download {set_code}/{number} ({variant})")
        time.sleep(args.sleep)
    print(f"Completed: {downloaded}/{total} images downloaded.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
