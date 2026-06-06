// ============================================================
//  Service Worker - Carnet de voyage Madrid
//  Strategie : NETWORK-FIRST
//  -> a chaque lancement avec reseau, on recupere la derniere
//     version (fini la reinstallation manuelle apres git push).
//  -> sans reseau, on retombe sur le cache (consultable hors-ligne).
//
//  IMPORTANT : a chaque mise a jour du carnet, il suffit
//  d'incrementer le numero de version ci-dessous (ex: v3 -> v4).
//  L'ancien cache sera automatiquement supprime.
// ============================================================

const CACHE_VERSION = 'madrid-v1';

// Fichiers mis en cache pour le hors-ligne
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// --- INSTALL : on pre-cache les fichiers de base ---
self.addEventListener('install', function(event) {
  // Le nouveau SW s'active sans attendre la fermeture des onglets
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {});
    })
  );
});

// --- ACTIVATE : on supprime tous les anciens caches ---
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Le SW prend le controle immediatement de toutes les pages
      return self.clients.claim();
    })
  );
});

// --- FETCH : network-first ---
// On essaie toujours le reseau d'abord ; on met a jour le cache au passage.
// Si le reseau echoue (hors-ligne), on sert la version en cache.
self.addEventListener('fetch', function(event) {
  // On ne gere que les requetes GET de meme origine
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Reseau OK : on rafraichit le cache avec la nouvelle version
        var copy = response.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(event.request, copy).catch(function() {});
        });
        return response;
      })
      .catch(function() {
        // Hors-ligne : on sert le cache, avec repli sur index.html
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// Permet a la page de forcer l'activation immediate si besoin
self.addEventListener('message', function(event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
