import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/layout/MainLayout';
import MobileLayout from '../components/MobileLayout';
import { isRunningAsPwa, isMobileDevice, isIOS } from '../lib/pwaUtils';
import MobileEmulator from '../components/MobileEmulator';
import Link from 'next/link';

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
  
  // Device type definition
  interface DeviceSpec {
    name: string;
    width: number;
    height: number;
  }
  
  // Simulated devices for testing
  const devices: DeviceSpec[] = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12/13', width: 390, height: 844 },
    { name: 'iPhone 12/13 Pro Max', width: 428, height: 926 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'Samsung Galaxy S20', width: 360, height: 800 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro 11"', width: 834, height: 1194 }
  ];
  
  const [selectedDevice, setSelectedDevice] = useState<DeviceSpec>(devices[0]);
  
  const simulateDevice = (device: DeviceSpec) => {
    setSelectedDevice(device);
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
    <Layout title="Mobile Testing - SalaryCursor">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mobile Experience Testing</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Use this page to test the SalaryCursor mobile experience across different devices and conditions.
        </p>
        
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
                      className={`px-3 py-2 text-sm rounded-md ${
                        selectedDevice?.name === device.name
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                      }`}
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
                      if ('caches' in window) {
                        window.caches.keys().then(cacheNames => {
                          setInstallStatus(`Found ${cacheNames.length} caches: ${cacheNames.join(', ')}`);
                        });
                      } else {
                        setInstallStatus('Cache API not supported in this browser');
                      }
                    }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100"
                  >
                    Check Cache Status
                  </button>
                  <button
                    onClick={() => {
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                          setInstallStatus(`Found ${registrations.length} service worker registrations`);
                        });
                      } else {
                        setInstallStatus('Service Worker API not supported in this browser');
                      }
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
                  {['/', '/dashboard', '/salary', '/leave', '/schedule'].map((path) => (
                    <a
                      key={path}
                      href={path}
                      className="px-4 py-2 text-sm font-medium text-center rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                    >
                      {path === '/' ? 'Home' : path.substring(1)}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Device Emulator */}
        <div className="mt-8 bg-white dark:bg-dark-surface shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Device Emulator</h2>
          </div>
          <div className="border-t border-gray-200 dark:border-dark-border px-4 py-5 sm:p-6">
            <MobileEmulator 
              url={`http://localhost:${window.location.port}/test-mobile-preview`} 
              width={selectedDevice.width}
              height={selectedDevice.height}
              deviceName={selectedDevice.name}
            />
          </div>
        </div>
        
        {/* Responsive UI Test Area */}
        <div className="mt-8 bg-white dark:bg-dark-surface shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Responsive UI Test Components</h2>
          </div>
          <div className="border-t border-gray-200 dark:border-dark-border px-4 py-5 sm:p-6">
            <div className="space-y-6">
              {/* Cards Grid */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Card Layout</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-dark-surface shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
                <div className="bg-white dark:bg-dark-surface rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
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
        
        {/* PWA Installation Guide */}
        <div className="mt-8 bg-white dark:bg-dark-surface shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">PWA Installation Guide</h2>
          </div>
          <div className="border-t border-gray-200 dark:border-dark-border px-4 py-5 sm:p-6">
            <div className="prose dark:prose-invert max-w-none">
              <h3>How to Install SalaryCursor as a PWA</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h4>On iOS (Safari)</h4>
                  <ol className="list-decimal list-inside">
                    <li>Open SalaryCursor in Safari</li>
                    <li>Tap the Share button</li>
                    <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                    <li>Tap &quot;Add&quot; in the upper right corner</li>
                  </ol>
                </div>
                
                <div>
                  <h4>On Android (Chrome)</h4>
                  <ol className="list-decimal list-inside">
                    <li>Open SalaryCursor in Chrome</li>
                    <li>Tap the menu button (three dots)</li>
                    <li>Tap &quot;Add to Home screen&quot;</li>
                    <li>Tap &quot;Add&quot; when prompted</li>
                  </ol>
                </div>
              </div>
              
              <div className="mt-4">
                <h4>On Desktop (Chrome, Edge, or Safari)</h4>
                <p>Look for the install icon in the address bar or use the browser menu to find the &quot;Install&quot; option.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Test Section</h3>
            <p className="text-gray-600">
              This is a test paragraph with some &quot;text&quot; that needs to be escaped.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Another Section</h3>
            <p className="text-gray-600">
              Here&apos;s another test with &quot;escaped&quot; quotes.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
