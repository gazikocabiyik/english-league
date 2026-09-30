// Çevrimdışı açılış durumu: Service Worker'a sorar, kaç dosyanın tahtaya indiğini döndürür.
// { state: 'off' | 'loading' | 'ready', cached, total }
export async function offlineStatus(timeout = 3000) {
  if (!('serviceWorker' in navigator)) return { state: 'off' };
  const reg = await navigator.serviceWorker.getRegistration();
  const worker = reg?.installing ?? reg?.waiting ?? reg?.active;
  if (!worker) return { state: 'off' };
  const reply = await new Promise(resolve => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), timeout);
    ch.port1.onmessage = e => { clearTimeout(timer); resolve(e.data); };
    worker.postMessage('offline-status', [ch.port2]);
  });
  if (!reply?.total) return { state: 'loading', cached: 0, total: 0 };
  // Yeni sürüm iniyorsa (installing) henüz hazır değil; eski sürüm tahtada çalışmaya devam eder
  const ready = reply.cached >= reply.total && worker !== reg.installing;
  // update: yeni sürüm inmiş, Chrome kapanıp açılınca geçilecek
  return { state: ready ? 'ready' : 'loading', cached: reply.cached, total: reply.total, update: ready && worker === reg.waiting };
}
