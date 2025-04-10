/**
 * The Service Worker for offline functionality
 */

const CACHE_NAME = 'salarycursor-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/_next/static/chunks/*.js',
  '/_next/static/chunks/*.css',
  '/_next/static/chunks/*.woff2',
  '/_next/static/chunks/*.png',
  '/_next/static/chunks/*.svg',
  '/_next/static/chunks/*.ico',
  '/_next/static/chunks/*.json',
  '/manifest.json',
  '/icons/*',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(urlsToCache);
    })
  );
  // Activate worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('salarycursor-cache-') && cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          console.log('Service Worker: Deleting old cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients...');
      return self.clients.claim();
    })
  );
});

// Unified fetch event handler
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle the fetch event differently based on the request type
  if (event.request.mode === 'navigate') {
    // Handle navigation requests (page loads)
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('Service Worker: Navigation fetch failed, falling back to offline page');
          return caches.match('/offline.html');
        })
    );
  } else if (event.request.method === 'GET') {
    // Handle GET requests with a cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached response if found
          if (cachedResponse) {
            console.log('Service Worker: Serving from cache:', event.request.url);
            return cachedResponse;
          }

          // If not in cache, fetch from network
          return fetch(event.request)
            .then((networkResponse) => {
              // Check if we received a valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                console.log('Service Worker: Network fetch completed without caching:', event.request.url);
                return networkResponse;
              }

              // Cache the new response
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  console.log('Service Worker: Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                });

              return networkResponse;
            })
            .catch((error) => {
              console.error('Service Worker: Fetch failed:', error);
              // You might want to return a default offline response for specific file types
              if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
                return caches.match('/icons/offline-image.svg');
              }
              throw error;
            });
        })
    );
  } else {
    // For non-GET requests, go straight to the network
    event.respondWith(fetch(event.request));
  }
});

// Message event - handle refresh requests 
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REFRESH_CACHE') {
    console.log('Service Worker: Refreshing cache...');
    
    // Clear all caches and re-fetch current page
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Service Worker: Deleting cache', cacheName);
            return caches.delete(cacheName);
          })
        ).then(() => {
          console.log('Service Worker: Cache cleared successfully');
          
          // Send a message back to the client that cache refresh is complete
          if (event.source) {
            event.source.postMessage({
              type: 'REFRESH_COMPLETE'
            });
          }
          
          // Re-cache critical assets
          return caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Re-caching critical assets');
            return cache.addAll(urlsToCache);
          });
        });
      })
    );
  }
});
