// PWA installation prompt logic
// Use window scoping to prevent duplicate declarations
(function() {
  // Make sure we don't re-initialize if already loaded
  if (window.pwaPromptInitialized) {
    return;
  }
  window.pwaPromptInitialized = true;

  // Use window object to store deferredPrompt to prevent duplicate declarations
  window.deferredPrompt = null;
  const installPromptElement = document.getElementById('pwa-install-prompt');
  const installButton = document.getElementById('pwa-install-button');

// Check if the browser supports PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 76+ from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  window.deferredPrompt = e;
  // Show the install prompt after a delay to not distract initial user experience
  setTimeout(() => {
    if (installPromptElement) {
      installPromptElement.classList.remove('hidden');
    }
  }, 30000); // Show after 30 seconds of app usage
});

// Installation button click handler
if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!window.deferredPrompt) {
      // The deferred prompt isn't available
      return;
    }
    // Show the install prompt
    window.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await window.deferredPrompt.userChoice;
    // We no longer need the prompt regardless of outcome
    window.deferredPrompt = null;
    // Hide the install button
    installPromptElement.classList.add('hidden');
  });
}

// Track when the PWA is successfully installed
window.addEventListener('appinstalled', () => {
  // Clear the deferredPrompt variable
  window.deferredPrompt = null;
  // Hide the install prompt
  if (installPromptElement) {
    installPromptElement.classList.add('hidden');
  }
  // Optionally log or notify the user
  console.log('PWA was installed');
});

})(); // End self-executing function
