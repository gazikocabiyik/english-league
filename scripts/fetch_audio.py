#!/usr/bin/env python3
"""Kitabın dinleme seslerini (MEB ders kitabı, ingilizcehocam.net arşivi) ünite klasörüne indirir.

Kullanım:  python3 scripts/fetch_audio.py 11 1     → app/content/11/audio/1.1.mp3 …
Sayfadaki çalma listesinden yalnız o temanın parçaları (ör. 1.x) alınır; var olan dosya yeniden inmez.
Dosyalar tahtanın çevrimdışı hafızasına da girer (node scripts/precache.mjs).
"""
import json
import subprocess
import pathlib
import re
import sys
import urllib.request

grade, theme = sys.argv[1], sys.argv[2]
PAGE = f'https://ingilizcehocam.net/index.php/{grade}-sinif/{grade}-sinif-audio'
BASE = 'https://ingilizcehocam.net/'
out = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'content' / grade / 'audio'
out.mkdir(parents=True, exist_ok=True)

req = lambda url: urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60)
html = req(PAGE).read().decode('utf-8', 'replace')
tracks = [json.loads(m) for m in re.findall(r'\{"track": \d+[^{}]*\}', html)]  # listenin sonunda fazladan virgül var
mine = [t for t in tracks if t['name'].split('.')[0] == theme]
for t in mine:
    dest = out / f"{t['name']}.mp3"
    if dest.exists():
        print('var  ', dest.name)
        continue
    raw = dest.with_suffix('.orig.mp3')
    raw.write_bytes(req(BASE + t['mediaPath']).read())
    # Konuşma için 64 kbps mono yeter: dosya ~4 kat küçülür (telefon interneti ve tahta hafızası için)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-ac', '1', '-b:a', '64k', str(dest)], check=True)
    raw.unlink()
    print('indi ', dest.name, t['length'])
