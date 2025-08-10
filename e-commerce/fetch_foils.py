"""
Fetch Pokemon card foil images from the poke-holo CDN (best-effort brute probe).

- Gère numéros alphanumériques: TG03, GG01, SV107, SWSH179, etc.
- Essaie plusieurs représentations: "160", "160".zfill(3) => "160", préfixe+digits en lower/upper, etc.
- Utilise les chemins réellement observés: /foils/<setCode>/foils/upscaled/<number>_<variant>_2x.webp
- Parcourt une liste de variants du plus spécifique au plus générique.

Usage:
  pip install requests
  python fetch_foils.py cards.json --out public/foils
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import List, Optional, Dict, Any, Iterable

try:
    import requests
except ImportError as exc:
    raise SystemExit(
        "The requests library is required. Install with `pip install requests`."
    ) from exc


CDN_BASE = "https://poke-holo.b-cdn.net/foils"

# Suffixes observés sur le CDN (ordre important: spécifiques -> génériques)
VARIANTS: List[str] = [
    "foil_etched_swsecret",     # Rainbow / secrets (souvent VMAX rainbow, etc.)
    "foil_etched_sunpillar",    # V / VMAX / VSTAR texturés
    "foil_etched_radiantholo",  # Radiant
    "foil_fullart",             # Full art / alt
    "foil_alt",                 # Alternate art (autre nom)
    "foil_swsecret",            # Secrets simples
    "foil_holo_rainbow",        # TG rainbow-esque
    "foil_holo_swholo",         # Holo style SWSH
    "foil_holo_cosmos",         # Cosmos (WOTC / promos)
    "foil_holo_reverse",        # Reverse
    "foil_etched",              # Etched générique
    "foil_holo",                # Holo générique
    "foil",                     # Fallback très générique
]

def load_cards(filename: str) -> List[Dict[str, Any]]:
    try:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise SystemExit(f"Error reading JSON {filename}: {exc}") from exc

    cards: List[Dict[str, Any]] = []
    for idx, entry in enumerate(data):
        # Accepte {setCode, number} ou {set, number}
        set_code = str(entry.get("setCode") or entry.get("set") or "").strip()
        number = str(entry.get("number") or "").strip()
        if not set_code or not number:
            raise SystemExit(f"Missing setCode/set or number at index {idx}")
        cards.append({"setCode": set_code, "number": number})
    return cards


def gen_number_candidates(raw: str) -> List[str]:
    """
    Génère toutes les formes plausibles du numéro pour le CDN.
    Exemples d'entrées: "160", "033/172", "TG03", "GG01", "SV107", "SWSH179"
    """
    s = str(raw).strip()
    base = s.split("/")[0]  # garde la partie avant un éventuel "/"
    out: "set[str]" = set()

    # forme originale + case variants
    out.add(base)
    out.add(base.lower())
    out.add(base.upper())

    # match préfixe lettres + chiffres
    import re
    m = re.match(r"^([A-Za-z]*)(\d+)$", base)
    if m:
        prefix, digits = m.group(1), m.group(2)
        try:
            n_no_lead = str(int(digits, 10))  # strip leading zeros
        except ValueError:
            n_no_lead = digits
        n3 = n_no_lead.zfill(3)

        # numérique seul (beaucoup de fichiers existent au format 3 chiffres)
        out.add(n_no_lead)
        out.add(n3)

        if prefix:
            # préfixe + digits en lower/upper, avec et sans zero-padding
            out.add(prefix.lower() + n_no_lead)
            out.add(prefix.lower() + n3)
            out.add(prefix.upper() + n_no_lead)
            out.add(prefix.upper() + n3)
    else:
        # si 100% numérique, tenter aussi le zfill(3)
        try:
            n = str(int(base, 10))
            out.add(n.zfill(3))
        except ValueError:
            pass

    # nettoyer
    out.discard("000")
    return list(out)


def build_urls(set_code: str, numbers: Iterable[str], variants: Iterable[str]) -> Iterable[str]:
    """
    Construit les URLs candidates (ordre = numbers puis variants).
    - set_code en minuscules (les dossiers du CDN sont case-sensitive)
    - chemin 'foils/upscaled'
    - extension .webp en 2x (observé)
    """
    sc = set_code.lower().strip()
    for n in numbers:
        nn = n.strip()
        if not nn:
            continue
        for v in variants:
            yield f"{CDN_BASE}/{sc}/foils/upscaled/{nn}_{v}_2x.webp"


def head_first_ok(urls: Iterable[str], timeout: float = 6.0) -> Optional[str]:
    """
    Frappe en HEAD chaque URL et retourne la première qui renvoie 200.
    """
    for url in urls:
        try:
            r = requests.head(url, timeout=timeout)
            if r.status_code == 200:
                return url
        except requests.RequestException:
            # on ignore et continue
            pass
    return None


def download(url: str, dest: Path, timeout: float = 10.0) -> bool:
    try:
        r = requests.get(url, timeout=timeout)
        if r.status_code != 200:
            return False
    except requests.RequestException:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        dest.write_bytes(r.content)
        return True
    except Exception:
        return False


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Download Pokemon foil overlays from poke-holo CDN.")
    parser.add_argument("cards_json", help="Path to JSON file with list of {setCode, number}.")
    parser.add_argument("--out", default="public/foils", help="Output base dir (default: public/foils)")
    parser.add_argument("--sleep", type=float, default=0.05, help="Delay between probes (seconds)")
    parser.add_argument("--head-timeout", type=float, default=6.0, help="HEAD timeout (s)")
    parser.add_argument("--get-timeout", type=float, default=10.0, help="GET timeout (s)")
    args = parser.parse_args(argv)

    cards = load_cards(args.cards_json)
    out_base = Path(args.out)

    total = len(cards)
    hits = 0

    for i, c in enumerate(cards, 1):
        set_code = c["setCode"]
        number = c["number"]

        number_candidates = gen_number_candidates(number)
        urls = list(build_urls(set_code, number_candidates, VARIANTS))
        found = head_first_ok(urls, timeout=args.head_timeout)

        if not found:
            print(f"[{i}/{total}] No foil found for {set_code}/{number}")
        else:
            # on sauvegarde en miroir: <out>/<setCode>/<number>.webp
            # (on garde le 'number' original comme nom standard local)
            dest = out_base / set_code.lower() / f"{number}.webp"
            ok = download(found, dest, timeout=args.get_timeout)
            if ok:
                hits += 1
                print(f"[{i}/{total}] Downloaded {set_code}/{number}  ← {found}")
            else:
                print(f"[{i}/{total}] Failed download {set_code}/{number}  ← {found}")
        time.sleep(args.sleep)

    print(f"Completed: {hits}/{total} images downloaded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
