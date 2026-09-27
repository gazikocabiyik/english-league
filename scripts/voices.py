#!/usr/bin/env python3
"""Ünite dosyalarındaki kelime, komut ve cümleleri Kokoro ile doğal sesle MP3'e çevirir.

Kurulum (bir kez):  uv venv -p 3.12 .venv-tts && uv pip install -p .venv-tts "kokoro>=0.9" soundfile \
                    "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
Kullanım:          .venv-tts/bin/python scripts/voices.py        (yalnız eksik sesleri üretir)
Sesler sırayla kadın/erkek, ABD/İngiliz dönüşür; aynı metin her zaman aynı sesle okunur.
"""
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile

import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from text_rules import fill_frame, fill_job, key  # noqa: E402

CONTENT = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'content'
VOICES = [('a', 'af_heart'), ('a', 'am_michael'), ('b', 'bf_emma'), ('b', 'bm_george')]
SPEED = 0.9  # A1–A2 için biraz yavaş


def texts_of(unit):
    # (metin, ses seçimi için tohum): kelime ve bütün seviyelerdeki cümlesi aynı sesle okunur
    frames = unit['frames'] if isinstance(unit['frames'], dict) else {'A2': unit['frames']}
    out = []
    for v in unit['vocab']:
        out.append((v['word'], v['word']))
        out += [(fill_frame(fs[v['frame']], v['word']), v['word']) for fs in frames.values()]
    out += [(c['text'], c['text']) for c in unit['commands']]
    iv = unit.get('interview')
    if iv:  # mülakat soruları; {job} içerenler her meslek için ayrı
        for qs in iv['questions'].values():
            for x in qs:
                jobs = iv['jobs'] if '{job}' in x['q'] else [iv['jobs'][0]]
                out += [(fill_job(x['q'], j), x['q']) for j in jobs]
    dj = unit.get('dj')
    if dj:  # Warm-up DJ durum kartları
        out += [(x['text'], x['text']) for x in dj['situations']]
    return list(dict.fromkeys(out))


def main():
    manifest_path = CONTENT / 'audio' / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    index = json.loads((CONTENT / 'index.json').read_text())
    pipes = {}
    made = 0
    wanted = set()
    for grade, units in index.items():
        for n in units:
            unit = json.loads((CONTENT / grade / f'unit{n}.json').read_text(encoding='utf-8'))
            for text, seed in texts_of(unit):
                k = key(text)
                wanted.add(k)
                if k in manifest and (CONTENT / manifest[k]).exists():
                    continue
                h = hashlib.md5(k.encode()).hexdigest()
                lang, voice = VOICES[int(hashlib.md5(key(seed).encode()).hexdigest(), 16) % len(VOICES)]
                pipe = pipes.setdefault(lang, KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M'))
                audio = np.concatenate([a for _, _, a in pipe(text, voice=voice, speed=SPEED)])
                rel = f'audio/{grade}/{h[:12]}.mp3'
                out = CONTENT / rel
                out.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
                    sf.write(wav.name, audio, 24000)
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav.name, '-ac', '1', '-b:a', '64k', str(out)], check=True)
                manifest[k] = rel
                made += 1
                manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False, sort_keys=True))
    # Artık kullanılmayan sesleri sil
    for k in [k for k in manifest if k not in wanted]:
        (CONTENT / manifest.pop(k)).unlink(missing_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False, sort_keys=True))
    print(f'{made} yeni ses, toplam {len(manifest)}')


main()
