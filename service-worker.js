// Service Worker per HUGÒ - Strategia Network First
// Cache name con versione per facilitare aggiornamenti
// INCREMENTA LA VERSIONE QUANDO AGGIORNI IL SITO per forzare l'aggiornamento della cache
const CACHE_NAME = 'hugohub-v3';
const RUNTIME_CACHE = 'hugohub-runtime-v3';

// File da mettere in cache all'installazione
const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/home.html',
  '/style.css',
  '/manifest.json',
  '/logo.png',
  '/logomini.png',
  '/taglieri.html',
  '/food.html',
  '/primi-secondi-contorni.html',
  '/piccoli-morsi.html',
  '/frittatine.html',
  '/birre.html',
  '/birre-altre-bevande.html',
  '/vini.html',
  '/cocktails.html',
  '/listening-party.html',
  '/unconventional.html',
  '/goat.html',
  '/paloma.html',
  '/negroni.html',
  '/bavarese.html',
  '/mocktails.html',
  '/gin.html',
  '/componigin.html',
  '/tonica.html',
  '/winebeer.html',
  '/bianchi.html',
  '/rossi.html',
  '/birre.html',
  '/allergeni.html',
  '/social.html',
  '/network.html',
  '/autore.html',
  '/policy.html',
  '/404.html'
];

// Installazione: precache dei file principali
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione nuova versione...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching file...');
        // Usa cache: 'reload' per forzare il download dei file aggiornati
        return cache.addAll(PRECACHE_FILES.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[Service Worker] Installazione completata, attivazione immediata...');
        return self.skipWaiting(); // Attiva immediatamente il nuovo service worker
      })
      .catch((error) => {
        console.error('[Service Worker] Errore durante l\'installazione:', error);
      })
  );
});

// Attivazione: pulizia cache vecchie
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione nuova versione...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Rimuovi tutte le cache vecchie (anche quelle con versioni precedenti)
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && 
              (cacheName.startsWith('hugohub-') || cacheName.startsWith('hugohub-runtime-'))) {
            console.log('[Service Worker] Rimozione cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Cache vecchie rimosse, prendo controllo delle pagine...');
      return self.clients.claim(); // Prendi controllo di tutte le pagine
    }).then(() => {
      // Forza il reload di tutte le pagine aperte per applicare gli aggiornamenti
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', cacheVersion: CACHE_NAME });
        });
      });
    })
  );
});

// Fetch: STRATEGIA NETWORK FIRST
self.addEventListener('fetch', (event) => {
  // Ignora richieste non GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora richieste a domini esterni (CDN, API, ecc.)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && 
      !url.href.includes('fonts.googleapis.com') &&
      !url.href.includes('fonts.gstatic.com') &&
      !url.href.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    // Prova prima la rete (Network First)
    fetch(event.request, { 
      cache: 'no-store', // Forza sempre il controllo della rete per HTML
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
      .then((response) => {
        // Se la rete funziona, clona e salva in cache
        const responseToCache = response.clone();
        
        // Salva solo risposte valide (status 200)
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, prova la cache
        console.log('[Service Worker] Rete non disponibile, uso cache per:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se non c'è in cache, prova con la cache di precache
          return caches.match(event.request.url);
        });
      })
  );
});

