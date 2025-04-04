# SalaryCursor Mobile Web App Testing Guide

This guide provides instructions for testing the mobile web experience of SalaryCursor.

## Testing Environment Setup

We've created a comprehensive testing environment to verify the mobile experience of SalaryCursor. The testing environment includes:

1. **Mobile Device Emulator**: Test the application on various mobile device sizes and orientations
2. **PWA Installation Testing**: Verify that the app can be installed as a Progressive Web App
3. **Responsive UI Tests**: Check component behavior across different screen sizes
4. **Offline Functionality**: Test how the app behaves with limited or no connectivity

## Running the Mobile Testing Environment

To run the mobile testing environment:

```bash
# Start the mobile testing environment
node scripts/mobile-test.js
```

This will:
1. Verify your PWA configuration
2. Start a development server with mobile testing optimizations
3. Provide a testing dashboard at http://localhost:3000/mobile-test

## Testing on Real Devices

For testing on actual mobile devices:

1. Make sure your development machine and mobile device are on the same network
2. Find your development machine's IP address:
   - On MacOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - On Windows: `ipconfig`
3. On your mobile device, navigate to: `http://<your-ip-address>:3000`

For external access (from outside your network), you can use a tool like ngrok:

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Create a tunnel to your local development server
ngrok http 3000
```

## What to Test

### Core Mobile Features
- [ ] Responsive layout on different screen sizes
- [ ] Touch-friendly controls (buttons, forms, tables)
- [ ] Bottom navigation bar functionality
- [ ] Mobile navigation menu (hamburger menu)
- [ ] Proper spacing and font sizes on mobile

### PWA Features
- [ ] Service worker installation
- [ ] Offline functionality
- [ ] App installation on home screen
- [ ] App icon display
- [ ] Splash screen on launch
- [ ] Orientation handling

### Performance
- [ ] Initial load time on mobile devices
- [ ] Scrolling performance
- [ ] Form input responsiveness
- [ ] Navigation transitions

## Browser Compatibility

Test the mobile experience in these browsers:
- Safari on iOS
- Chrome on Android
- Chrome on iOS
- Firefox on Android

## PWA Installation Instructions

### On iOS (Safari)
1. Open SalaryCursor in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the upper right corner

### On Android (Chrome)
1. Open SalaryCursor in Chrome
2. Tap the menu button (three dots)
3. Tap "Add to Home screen"
4. Tap "Add" when prompted

### On Desktop (Chrome, Edge, or Safari)
Look for the install icon in the address bar or use the browser menu to find the "Install" option.

## Troubleshooting

If you encounter issues during testing:

1. Check the browser console for errors
2. Verify that service workers are registered correctly
3. Clear browser cache and try again
4. Try a different browser to isolate browser-specific issues

## Lighthouse Auditing

For a comprehensive assessment of your PWA:

1. Open Chrome DevTools (F12)
2. Go to the "Lighthouse" tab
3. Check the "Progressive Web App" category
4. Click "Generate report"

Use the results to identify and address any issues with your PWA implementation.
