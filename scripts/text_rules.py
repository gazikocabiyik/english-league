"""Metin kuralları: app/core/speech-map.js (speechKey, fillFrame) ile birebir aynı olmalı."""
import re


def key(text):
    return re.sub(r'\s+', ' ', text.strip()).lower()


def fill_frame(frame, word):
    article = 'an' if re.match(r'[aeiou]', word, re.I) else 'a'
    s = frame.replace('a/an ___', f'{article} ___', 1).replace('___', word, 1)
    s = re.sub(r'\s+is\s*…\s*$', '.', s)
    return re.sub(r'\s*…\s*$', '', s)


def fill_job(text, word):  # app/modules/mock-interview/interview.js fillJob ile aynı
    article = 'an' if re.match(r'[aeiou]', word, re.I) else 'a'
    return text.replace('{job}', f'{article} {word}')
