// Service Worker for SalaryCursor PWA
const CACHE_NAME = 'salary-cursor-v1';

// Assets to cache initially
const PRE_CACHE_URLS = [
  '/',
  '/dashboard',
  '/salary',
  '/leave',
  '/schedule',
  '/login',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - pre-cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRE_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', event => {
  // Skip for API calls and supabase - don't cache these
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response before using it
        const responseClone = response.clone();
        
        // Open cache and store response
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseClone);
          });
          
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Nothing in cache for HTML requests - return offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
          });
      })
  );
});
