// Service Worker for SalaryCursor PWA
const CACHE_NAME = 'salary-cursor-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';
const QUEUE_NAME = 'offline-queue';

// Assets to cache initially
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/salary',
  '/leave',
  '/schedule',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
  '/_next/static/',
  '/icons/'
];

// API routes that should be cached
const API_ROUTES = [
  '/api/salary',
  '/api/leave',
  '/api/schedule'
];

// Install event - pre-cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(API_CACHE),
      caches.open(DYNAMIC_CACHE)
    ]).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('salary-cursor-'))
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Background sync for offline mutations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

// Helper function to determine caching strategy based on request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  if (request.method !== 'GET') {
    return 'network-only';
  }
  
  if (STATIC_ASSETS.some(asset => url.pathname.startsWith(asset))) {
    return 'cache-first';
  }
  
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    return 'network-first';
  }
  
  return 'stale-while-revalidate';
}

// Fetch event - implement different caching strategies
self.addEventListener('fetch', event => {
  const strategy = getCacheStrategy(event.request);
  
  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request));
      break;
    case 'network-only':
      event.respondWith(networkOnly(event.request));
      break;
    default:
      event.respondWith(staleWhileRevalidate(event.request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  return cached || fetch(request);
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(API_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return caches.match('/offline.html');
  }
}

// Network-only strategy with offline queueing
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Queue failed mutations for later
    if (request.method !== 'GET') {
      await queueMutation(request);
      return new Response(JSON.stringify({ queued: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  
  const networkPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
  
  return cached || networkPromise;
}

// Queue mutation for later
async function queueMutation(request) {
  const queue = await openQueue();
  await queue.add({
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now()
  });
}

// Process queued mutations
async function syncMutations() {
  const queue = await openQueue();
  const mutations = await queue.getAll();
  
  for (const mutation of mutations) {
    try {
      await fetch(mutation.url, {
        method: mutation.method,
        headers: new Headers(mutation.headers),
        body: mutation.body
      });
      await queue.delete(mutation.id);
    } catch (error) {
      console.error('Failed to sync mutation:', error);
    }
  }
}

// Helper to open IndexedDB queue
async function openQueue() {
  const db = await openDB(QUEUE_NAME, 1, {
    upgrade(db) {
      db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
    }
  });
  return db.transaction('mutations', 'readwrite').objectStore('mutations');
}

// Handle offline page
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
  }
});
