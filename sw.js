const CACHE = 'cobros-v5';
const ASSETS = ['./'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Nunca cachear la sincronización con GitHub
  if (url.hostname === 'api.github.com') return;

  // La PÁGINA (HTML) siempre desde la red si hay internet, para recibir las
  // actualizaciones al instante. Es la clave para la app de pantalla de inicio
  // en iOS, que si no se queda pegada a una versión vieja en caché.
  const accept = req.headers.get('accept') || '';
  const isDoc = req.mode === 'navigate' || (req.method === 'GET' && accept.includes('text/html'));
  if (isDoc) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./')))
    );
    return;
  }

  // Resto de recursos: rápido desde caché y se refresca en segundo plano.
  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
