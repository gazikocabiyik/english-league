#!/usr/bin/env python3
"""Ünite kelimeleri için Apify (memo23/pexels-scraper) üzerinden Pexels fotoğrafı indirir.

Token: proje kökündeki .env dosyasında APIFY_TOKEN=... (git'e girmez).
Kullanım:  python3 scripts/apify_photos.py app/content/11/unit2.json [--only kelime1,kelime2] [--force] [--skip 1]
Maliyet:   sonuç başına ~0,003 $ (her kelime için 5 sonuç istenir).
Var olan dosyaya dokunmaz (--force hariç). Kaynağı app/content/media/CREDITS.md'ye hemen yazar.
"""
import json
import pathlib
import re
import subprocess
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ACTOR = 'memo23~pexels-scraper'


def token():
    m = re.search(r'^APIFY_TOKEN=(\S+)', (ROOT / '.env').read_text(), re.M)
    if not m:
        sys.exit('.env içinde APIFY_TOKEN yok')
    return m.group(1)


def search(query, tok):
    body = json.dumps({'mode': 'search', 'searchQuery': query, 'mediaType': 'photos', 'maxItems': 5, 'orientation': 'landscape'}).encode()
    req = urllib.request.Request(f'https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items?timeout=180', data=body,
                                 headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=240) as r:
        return [x for x in json.load(r) if x.get('imageOriginal') and x.get('license') == 'Pexels']


def main():
    args = sys.argv[1:]
    unit_path = pathlib.Path(args[0])
    only = set(args[args.index('--only') + 1].split(',')) if '--only' in args else None
    skip = int(args[args.index('--skip') + 1]) if '--skip' in args else 0
    force = '--force' in args
    content = unit_path.parent.parent
    credits = content / 'media' / 'CREDITS.md'
    unit = json.loads(unit_path.read_text(encoding='utf-8'))
    tok = token()
    for v in unit['vocab']:
        if only and v['word'] not in only:
            continue
        dest = content / v['img']
        if dest.exists() and not force:
            print('var   ', v['word'])
            continue
        hits = search(v.get('q', v['word']), tok)
        if len(hits) <= skip:
            print('YOK   ', v['word'])
            continue
        hit = hits[skip]
        dest.parent.mkdir(parents=True, exist_ok=True)
        url = hit['imageOriginal'] + '?auto=compress&cs=tinysrgb&w=1280'
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'okul-sinif-ligi'}), timeout=60) as r:
            dest.write_bytes(r.read())
        subprocess.run(['sips', '-Z', '1280', str(dest)], capture_output=True)
        lines = credits.read_text(encoding='utf-8').splitlines() if credits.exists() else ['# Görsel kaynakları', '']
        lines = [l for l in lines if f'`{v["img"]}`' not in l]
        lines.append(f'- `{v["img"]}` — {hit["photographer"]}, Pexels License, {hit["url"]}')
        credits.write_text('\n'.join(lines) + '\n', encoding='utf-8')
        print('indi  ', v['word'], '—', hit['photographer'])


main()
