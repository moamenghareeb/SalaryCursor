// PWA Utility functions

// Function to load PWA install prompt script
export function loadPwaInstallScript() {
  // Only run on client-side
  if (typeof window === 'undefined') return;
  
  // Check if script is already loaded to prevent duplication
  const scriptId = 'pwa-install-script';
  if (document.getElementById(scriptId)) {
    console.log('PWA install script already loaded');
    return;
  }
  
  // Create script element with unique ID
  const script = document.createElement('script');
  script.id = scriptId;
  script.src = '/pwaInstallPrompt.js';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

// Function to check if the app is running in standalone mode (installed PWA)
export function isRunningAsPwa() {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone || 
           document.referrer.includes('android-app://');
  }
  return false;
}

// Function to detect mobile device
export function isMobileDevice() {
  if (typeof window !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
  return false;
}

// Function to check if the app is running on iOS
export function isIOS() {
  if (typeof window !== 'undefined') {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }
  return false;
}
