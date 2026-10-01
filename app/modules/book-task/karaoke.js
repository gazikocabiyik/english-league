// Karaoke metin: ses çalarken o anki satır ve kelime (zamanlar saniye; ikili arama).
// Boşluk anlarında (satırlar ya da kelimeler arası) bir önceki kalır, ekran titremesin.
function lastStartedBefore(items, t) {
  let lo = 0, hi = items.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].s <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

export function lineAt(lines, t) {
  if (!lines.length) return -1;
  return Math.max(0, lastStartedBefore(lines, t));
}

export function wordAt(line, t) {
  return line?.words?.length ? lastStartedBefore(line.words, t) : -1;
}
