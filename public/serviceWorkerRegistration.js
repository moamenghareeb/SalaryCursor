// This is the service worker registration script
// It should be imported in your _app.tsx file

// Flag to prevent multiple registrations
let isServiceWorkerRegistered = false;

export function registerServiceWorker() {
  // Skip if already registered or if running on server side
  if (isServiceWorkerRegistered || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  
  // Set flag to prevent multiple registrations
  isServiceWorkerRegistered = true;
  
  // Register the service worker on page load
  window.addEventListener('load', function() {
    // Check if already registered
    navigator.serviceWorker.getRegistrations().then(registrations => {
      // Only register if no existing registration for our scope exists
      if (registrations.length === 0 || !registrations.some(reg => reg.scope.includes(window.location.origin))) {
        // Register the service worker
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          function(err) {
            console.log('ServiceWorker registration failed: ', err);
            // Reset flag in case of failure
            isServiceWorkerRegistered = false;
          }
        );
      } else {
        console.log('ServiceWorker already registered');
      }
    });
  });
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
    });
  }
}
