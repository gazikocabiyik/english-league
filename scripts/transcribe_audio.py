#!/usr/bin/env python3
"""Kitap seslerinin metnini kelime kelime zamanlarıyla çıkarır (karaoke metin).

Kurulum (bir kez, projeye bağımlılık eklemez):
    uv venv -p 3.12 /tmp/stt && uv pip install -p /tmp/stt faster-whisper
Kullanım:
    /tmp/stt/bin/python scripts/transcribe_audio.py 11 1      → app/content/11/audio/1.x.json
Çıktı: { "lines": [ { "s", "e", "intro"?, "words": [ { "w", "s", "e" } ] } ] }
Baştaki yönerge (Theme 1 … Page 11 … Listen and …) "intro" olarak işaretlenir; ekranda soluk görünür.
Özel adlar sonra elle düzeltilebilir (FIX sözlüğü).
"""
import json
import pathlib
import re
import sys

from faster_whisper import WhisperModel

grade, theme = sys.argv[1], sys.argv[2]
folder = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'content' / grade / 'audio'
FIX = {'counsellor': 'counselor', 'Mr.': 'Mr'}  # kitabın yazımıyla tutarlılık
INTRO = re.compile(r'^(theme|listening|reading|pronunciation|page|workbook|video|part)\b', re.I)

model = WhisperModel('large-v3', device='cpu', compute_type='int8')
for mp3 in sorted(folder.glob(f'{theme}.*.mp3')):
    segs, _ = model.transcribe(str(mp3), language='en', beam_size=5, word_timestamps=True, vad_filter=True)
    lines = []
    for seg in segs:
        words = []
        for w in seg.words:
            t = w.word.strip()
            if not t or not re.search(r'[A-Za-z0-9]', t):  # anlamsız parça
                continue
            if t.startswith("'") and words:  # o + 'clock → o'clock
                words[-1]['w'] += t
                words[-1]['e'] = round(w.end, 2)
                continue
            words.append({'w': FIX.get(t, t), 's': round(w.start, 2), 'e': round(w.end, 2)})
        if words:
            lines.append({'s': words[0]['s'], 'e': words[-1]['e'], 'words': words})
    # Yönerge: baştan itibaren, yönerge sözcüğüyle başlayan ya da "listen" geçen satırlar (ilk 30 sn)
    for ln in lines:
        text = ' '.join(w['w'] for w in ln['words'])
        if ln['s'] < 30 and (INTRO.match(text) or re.search(r'\blisten\b', text, re.I)):
            ln['intro'] = True
        else:
            break
    out = mp3.with_suffix('.json')
    out.write_text(json.dumps({'lines': lines}, ensure_ascii=False, separators=(',', ':')))
    print(out.name, len(lines), 'satır')
