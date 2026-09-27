export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// n kelimeyi `repeats` kez dolaşan dizin listesi; blok sınırında aynı kelime art arda gelmez.
export function buildDeck(n, repeats = 3, rng = Math.random) {
  const out = [];
  for (let r = 0; r < repeats; r++) {
    const block = shuffle([...Array(n).keys()], rng);
    if (n > 1 && out.length && block[0] === out[out.length - 1]) [block[0], block[1]] = [block[1], block[0]];
    out.push(...block);
  }
  return out;
}

// Yeni kelimeler (0..n-1) 3'er kez, tekrar kelimeleri (n..n+r-1) birer kez araya serpiştirilir.
export function buildMixedDeck(newCount, reviewCount, rng = Math.random) {
  const deck = buildDeck(newCount, 3, rng);
  for (let k = newCount; k < newCount + reviewCount; k++) {
    deck.splice(Math.floor(rng() * (deck.length + 1)), 0, k);
  }
  return deck;
}
