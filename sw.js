// Service worker do GymApp: abre a app mesmo com rede fraca, sem nunca guardar dados do Supabase.
// Para forçar atualização em todos os telemóveis, muda o número da versão.
const V = 'gym-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;

  // Página: rede primeiro (vês sempre a versão nova); sem rede, usa a última guardada
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html') || caches.match('./'))));
    return;
  }

  // Ficheiros do próprio app e bibliotecas do CDN: guardados e atualizados em segundo plano
  if (u.origin === location.origin || u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(V).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
  // Tudo o resto (Supabase, etc.) passa direto, sem cache.
});
