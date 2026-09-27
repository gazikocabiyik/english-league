#!/usr/bin/env python3
"""Ünite dosyasındaki her kelime için Wikimedia Commons'tan serbest lisanslı gerçek fotoğraf indirir.

Kullanım:  python3 scripts/commons.py app/content/11/unit1.json [--force] [--only kelime]
Var olan dosyaya dokunmaz (--force hariç). Kaynağı app/content/media/CREDITS.md'ye ekler.
"""
import html
import time
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'okul-sinif-ligi/0.1 (egitim amacli prototip)'}
FREE = re.compile(r'^(CC0|Public domain|CC BY(-SA)? \d(\.\d)?)', re.I)


def get(url, tries=5):
    for n in range(tries):
        time.sleep(1.5)  # Wikimedia hız sınırı
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == tries - 1:
                raise
            time.sleep(10 * (n + 1))


def search(query, skip=0):
    params = {
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6,
        'gsrlimit': 20, 'gsrsearch': f'{query} filetype:bitmap',
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata|mime', 'iiurlwidth': 1280,
    }
    data = json.loads(get(f'{API}?{urllib.parse.urlencode(params)}'))
    pages = sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    hits = []
    for p in pages:
        info = p['imageinfo'][0]
        meta = info.get('extmetadata', {})
        lic = meta.get('LicenseShortName', {}).get('value', '')
        if info.get('mime') == 'image/jpeg' and FREE.match(lic) and info.get('thumbwidth', 0) >= 1000:
            artist = re.sub(r'<[^>]+>', '', html.unescape(meta.get('Artist', {}).get('value', 'bilinmiyor'))).strip()
            hits.append((info['thumburl'], info['descriptionurl'], artist, lic))
    return hits[skip] if len(hits) > skip else None


def main():
    unit_path = pathlib.Path(sys.argv[1])
    force = '--force' in sys.argv
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    skip = int(sys.argv[sys.argv.index('--skip') + 1]) if '--skip' in sys.argv else 0
    content = unit_path.parent.parent
    credits = content / 'media' / 'CREDITS.md'
    unit = json.loads(unit_path.read_text(encoding='utf-8'))
    if not credits.exists():
        credits.parent.mkdir(parents=True, exist_ok=True)
        credits.write_text('# Görsel kaynakları\n\nTüm görseller serbest lisanslıdır.\n\n', encoding='utf-8')
    for v in unit['vocab']:
        if only and v['word'] != only:
            continue
        dest = content / v['img']
        if dest.exists() and not force:
            print('var   ', v['word'])
            continue
        hit = search(v.get('q', v['word']), skip)
        if not hit:
            print('YOK   ', v['word'], '→ elle ekle (Pexels/Unsplash) ve CREDITS.md\'ye yaz')
            continue
        url, page, artist, lic = hit
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(get(url))
        with credits.open('a', encoding='utf-8') as f:
            f.write(f'- `{v["img"]}` — {artist}, {lic}, {page}\n')
        print('indi  ', v['word'])


main()
