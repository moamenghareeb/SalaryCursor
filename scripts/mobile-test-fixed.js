/**
 * Mobile testing script for SalaryCursor
 * This script launches a development server with mobile-optimized settings
 * and provides tools for testing the mobile experience
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Logger function
const log = {
  info: (message) => console.log(colors.blue + "ℹ" + colors.reset + " " + message),
  success: (message) => console.log(colors.green + "✓" + colors.reset + " " + message),
  warning: (message) => console.log(colors.yellow + "⚠" + colors.reset + " " + message),
  error: (message) => console.log(colors.red + "✗" + colors.reset + " " + message),
  title: (message) => console.log("\n" + colors.bright + colors.cyan + message + colors.reset + "\n")
};

// Verify PWA configuration
function verifyPWAConfig() {
  log.title('Verifying PWA Configuration');
  
  // Check for manifest.json
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  if (fs.existsSync(manifestPath)) {
    log.success('Web app manifest found');
    
    // Validate manifest content
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Check for required fields
      const requiredFields = ['name', 'short_name', 'icons', 'start_url', 'display'];
      const missingFields = requiredFields.filter(field => !manifest[field]);
      
      if (missingFields.length === 0) {
        log.success('Manifest contains all required fields');
      } else {
        log.warning('Manifest is missing required fields: ' + missingFields.join(', '));
      }
      
      // Check for icons
      if (manifest.icons && manifest.icons.length > 0) {
        log.success('Found ' + manifest.icons.length + ' icons defined in manifest');
        
        // Verify icon files exist
        const iconCount = manifest.icons.length;
        let existingIcons = 0;
        
        manifest.icons.forEach(icon => {
          const iconPath = path.join(__dirname, '..', icon.src.startsWith('/') ? icon.src.substring(1) : icon.src);
          if (fs.existsSync(iconPath)) {
            existingIcons++;
          } else {
            log.warning('Icon file not found: ' + icon.src);
          }
        });
        
        log.info(existingIcons + ' of ' + iconCount + ' icon files verified');
      } else {
        log.warning('No icons defined in manifest');
      }
    } catch (error) {
      log.error('Error parsing manifest.json: ' + error.message);
    }
  } else {
    log.error('Web app manifest not found');
  }
  
  // Check for service worker
  const swPath = path.join(__dirname, '../public/sw.js');
  if (fs.existsSync(swPath)) {
    log.success('Service worker script found');
  } else {
    log.error('Service worker script not found');
  }
  
  // Check for service worker registration
  const swRegPath = path.join(__dirname, '../public/serviceWorkerRegistration.js');
  if (fs.existsSync(swRegPath)) {
    log.success('Service worker registration script found');
  } else {
    log.error('Service worker registration script not found');
  }
}

// Launch development server with mobile-friendly settings
function startDevServer() {
  log.title('Starting Development Server with Mobile Testing Settings');
  
  // Run command to start server
  const serverProcess = exec('NEXT_PUBLIC_ENABLE_MOBILE_LAYOUT=true npm run dev', {
    cwd: path.join(__dirname, '..')
  });
  
  // Forward stdout and stderr
  serverProcess.stdout.pipe(process.stdout);
  serverProcess.stderr.pipe(process.stderr);
  
  // Listen for server ready message
  serverProcess.stdout.on('data', (data) => {
    if (data.includes('started server') || data.includes('ready') || data.includes('localhost')) {
      setTimeout(() => {
        displayTestingInstructions();
      }, 1000);
    }
  });
  
  // Handle server process exit
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      log.error('Development server exited with code ' + code);
    }
    process.exit(code);
  });
  
  // Handle SIGINT (Ctrl+C) to properly close the server
  process.on('SIGINT', () => {
    log.info('Shutting down development server...');
    serverProcess.kill('SIGINT');
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });
}

// Display testing instructions
function displayTestingInstructions() {
  log.title('Mobile Testing Instructions');
  
  console.log(
    '\n' + colors.bright + 'Available Testing Methods:' + colors.reset + '\n\n' +
    colors.bright + '1. Chrome DevTools Device Emulation' + colors.reset + '\n' +
    '   - Open Chrome DevTools (F12 or Cmd+Option+I)\n' +
    '   - Click the "Toggle Device Toolbar" button or press Cmd+Shift+M\n' +
    '   - Select a mobile device from the dropdown or set custom dimensions\n' +
    '   - Test touch events, responsive layout, and orientation\n\n' +
    colors.bright + '2. Testing PWA Installation' + colors.reset + '\n' +
    '   - In Chrome DevTools, go to "Application" tab\n' +
    '   - In the sidebar, select "Manifest" to verify manifest data\n' +
    '   - Click "Add to homescreen" to test installation flow\n' +
    '   - Go to "Service Workers" to test offline functionality\n\n' +
    colors.bright + '3. Testing on Real Devices' + colors.reset + '\n' +
    '   - Access your dev server from a mobile device on the same network:\n' +
    '     ' + colors.green + 'http://<your-local-ip>:3000' + colors.reset + '\n' +
    '   - To find your local IP, run: ' + colors.dim + 'ipconfig (Windows) or ifconfig (Mac/Linux)' + colors.reset + '\n' +
    '   - For external access, consider using ngrok: ' + colors.dim + 'npx ngrok http 3000' + colors.reset + '\n\n' +
    colors.bright + '4. Responsive Testing Tools' + colors.reset + '\n' +
    '   - Visit: ' + colors.cyan + 'http://localhost:3000/mobile-test' + colors.reset + '\n' +
    '   - This page provides device simulation and layout testing tools\n\n' +
    colors.bright + '5. Lighthouse PWA Audit' + colors.reset + '\n' +
    '   - In Chrome DevTools, go to "Lighthouse" tab\n' +
    '   - Check "Progressive Web App" category\n' +
    '   - Click "Generate report" to see PWA compliance score\n\n' +
    'Server is running at: ' + colors.green + 'http://localhost:3000' + colors.reset + '\n' +
    'Mobile test page:    ' + colors.green + 'http://localhost:3000/mobile-test' + colors.reset + '\n'
  );
}

// Main function
function main() {
  log.title('SalaryCursor Mobile Testing Environment');
  
  // Run verification checks
  verifyPWAConfig();
  
  // Create mobile test page if it doesn't exist
  const mobileTestDir = path.join(__dirname, '../pages');
  const mobileTestPage = path.join(mobileTestDir, 'mobile-test.tsx');
  
  if (!fs.existsSync(mobileTestPage)) {
    log.info('Creating mobile test page...');
    
    const testPageContent = `import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { isRunningAsPwa, isMobileDevice, isIOS } from '../lib/pwaUtils';

export default function MobileTest() {
  const [deviceInfo, setDeviceInfo] = useState({
    viewport: { width: 0, height: 0 },
    userAgent: '',
    isPwa: false,
    isMobile: false,
    isIOS: false,
    orientation: ''
  });
  
  useEffect(() => {
    // Get device information
    setDeviceInfo({
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userAgent: navigator.userAgent,
      isPwa: isRunningAsPwa(),
      isMobile: isMobileDevice(),
      isIOS: isIOS(),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    });
    
    // Update on resize
    const handleResize = () => {
      setDeviceInfo(prev => ({
        ...prev,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      }));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Simulated devices for testing
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12/13', width: 390, height: 844 },
    { name: 'iPhone 12/13 Pro Max', width: 428, height: 926 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'Samsung Galaxy S20', width: 360, height: 800 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro 11"', width: 834, height: 1194 }
  ];
  
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  const simulateDevice = (device) => {
    setSelectedDevice(device);
    // In a real implementation, this would resize an iframe or preview area
  };

  // PWA installation status
  const [installStatus, setInstallStatus] = useState('');
  const [offlineStatus, setOfflineStatus] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnlineStatus = () => {
      setOfflineStatus(navigator.onLine);
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);
  
  return (
    <Layout>
      <Head>
        <title>Mobile Testing - SalaryCursor</title>
      </Head>
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mobile Experience Testing</h1>
        
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Device Information Panel */}
          <div className="bg-white dark:bg-dark-surface shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Current Device Information</h2>
            </div>
            <div className="border-t border-gray-200 dark:border-dark-border px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Viewport Size</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {deviceInfo.viewport.width} × {deviceInfo.viewport.height}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Orientation</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                    {deviceInfo.orientation}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Device Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {deviceInfo.isMobile ? 'Mobile Device' : 'Desktop'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">PWA Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {deviceInfo.isPwa ? 'Running as installed PWA' : 'Running in browser'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">OS Platform</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {deviceInfo.isIOS ? 'iOS' : 'Other'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Network Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {offlineStatus ? 'Online' : 'Offline'}
                  </dd>
                </div>
              </dl>
              
              <div className="mt-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">User Agent</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                  {deviceInfo.userAgent}
                </dd>
              </div>
            </div>
          </div>
          
          {/* Testing Tools Panel */}
          <div className="bg-white dark:bg-dark-surface shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Testing Tools</h2>
            </div>
            <div className="border-t border-gray-200 dark:border-dark-border px-4 py-5 sm:p-6">
              {/* Device Simulator */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Simulate Device</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {devices.map((device) => (
                    <button
                      key={device.name}
                      onClick={() => simulateDevice(device)}
                      className={\`px-3 py-2 text-sm rounded-md \${
                        selectedDevice?.name === device.name
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                      }\`}
                    >
                      {device.name}
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {device.width}×{device.height}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* PWA Testing */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">PWA Testing</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      window.caches.keys().then(cacheNames => {
                        setInstallStatus(\`Found \${cacheNames.length} caches: \${cacheNames.join(', ')}\`);
                      });
                    }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100"
                  >
                    Check Cache Status
                  </button>
                  <button
                    onClick={() => {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        setInstallStatus(\`Found \${registrations.length} service worker registrations\`);
                      });
                    }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100"
                  >
                    Check Service Workers
                  </button>
                  <button
                    onClick={() => {
                      setOfflineStatus(false);
                      setTimeout(() => setOfflineStatus(true), 3000);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100"
                  >
                    Simulate Offline (3s)
                  </button>
                </div>
                {installStatus && (
                  <div className="mt-3 p-3 text-sm bg-gray-100 dark:bg-gray-800 rounded">
                    {installStatus}
                  </div>
                )}
              </div>
              
              {/* Navigation Testing */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Navigation Testing</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['/dashboard', '/salary', '/leave', '/schedule'].map((path) => (
                    <a
                      key={path}
                      href={path}
                      className="px-4 py-2 text-sm font-medium text-center rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                    >
                      {path.substring(1) || 'Home'}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Responsive UI Test Area */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Responsive UI Test Components</h2>
          
          <div className="space-y-6">
            {/* Cards Grid */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Card Layout</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-dark-surface shadow rounded-lg p-4">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {i}
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Card Title {i}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      This card tests responsive layout across different screen sizes.
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Form Elements */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Form Elements</h3>
              <div className="bg-white dark:bg-dark-surface shadow rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Input Field</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Test touch keyboard"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Menu</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                      <option>Option 1</option>
                      <option>Option 2</option>
                      <option>Option 3</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="checkbox"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="checkbox" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Test checkbox touch target
                    </label>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Test Button
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Table */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Responsive Table</h3>
              <div className="bg-white dark:bg-dark-surface shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                      {[1, 2, 3].map((i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Person {i}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Developer</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Active</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="#" className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}`;
    
    fs.writeFileSync(mobileTestPage, testPageContent);
    log.success('Mobile test page created');
  } else {
    log.info('Mobile test page already exists');
  }
  
  // Ask if user wants to continue
  rl.question(colors.yellow + 'Start the development server with mobile testing configuration? (Y/n)' + colors.reset + ' ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 'n') {
      startDevServer();
    } else {
      log.info('Exiting without starting server');
      process.exit(0);
    }
  });
}

// Run the main function
main();
