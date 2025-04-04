import React, { useState } from 'react';
import Layout from '../components/layout/MainLayout';
import MobileEmulator from '../components/MobileEmulator';
import { useTheme } from '../components/ThemeProvider';
import { useRouter } from 'next/router';

const TestMobilePreview = () => {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [testRoute, setTestRoute] = useState('/dashboard');
  const host = typeof window !== 'undefined' ? window.location.origin : '';

  // List of test routes
  const routes = [
    { value: '/dashboard', label: 'Dashboard' },
    { value: '/salary', label: 'Salary' },
    { value: '/leave', label: 'Leave' },
    { value: '/schedule', label: 'Schedule' }
  ];

  // Device configurations
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 13/14', width: 390, height: 844 },
    { name: 'iPhone 13/14 Pro Max', width: 428, height: 926 },
    { name: 'Pixel 6', width: 393, height: 851 },
    { name: 'Samsung Galaxy S22', width: 360, height: 780 }
  ];

  const [selectedDevice, setSelectedDevice] = useState(devices[0]);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 sc-text-primary">Mobile Preview Tester</h1>
        
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="sc-card p-4">
            <h2 className="text-lg font-semibold mb-3 sc-text-primary">Device & Route Settings</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 sc-text-secondary">Test Route:</label>
              <div className="flex gap-2">
                <select 
                  value={testRoute}
                  onChange={(e) => setTestRoute(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded p-2 flex-grow bg-gray-50 dark:bg-gray-800 sc-text-primary"
                >
                  {routes.map(route => (
                    <option key={route.value} value={route.value}>{route.label}</option>
                  ))}
                </select>
                <button 
                  className="sc-button sc-button-primary px-4 py-2 rounded"
                  onClick={() => router.push(testRoute)}
                >
                  Go to page
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 sc-text-secondary">Device:</label>
              <select
                value={selectedDevice.name}
                onChange={(e) => setSelectedDevice(devices.find(d => d.name === e.target.value) || devices[0])}
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-800 sc-text-primary"
              >
                {devices.map(device => (
                  <option key={device.name} value={device.name}>
                    {device.name} ({device.width}×{device.height})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="sc-card p-4">
            <h2 className="text-lg font-semibold mb-3 sc-text-primary">Theme Controls</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 sc-text-secondary">Current Theme: {resolvedTheme}</label>
              
              <div className="flex gap-2 mt-2">
                <button 
                  className={`px-4 py-2 rounded-md ${theme === 'light' ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 border' : 'bg-gray-100 dark:bg-gray-800'}`}
                  onClick={() => setTheme('light')}
                >
                  Light
                </button>
                <button 
                  className={`px-4 py-2 rounded-md ${theme === 'dark' ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 border' : 'bg-gray-100 dark:bg-gray-800'}`}
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </button>
                <button 
                  className={`px-4 py-2 rounded-md ${theme === 'system' ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 border' : 'bg-gray-100 dark:bg-gray-800'}`}
                  onClick={() => setTheme('system')}
                >
                  System
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded sc-text-primary">
                Current system preference: {typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded sc-text-primary">Resolved theme: {resolvedTheme}</div>
            </div>
          </div>
        </div>

        <div className="sc-card p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold sc-text-primary">Preview</h2>
            <div className="text-sm sc-text-secondary">
              {selectedDevice.name} - {testRoute}
            </div>
          </div>
          
          <MobileEmulator 
            url={`${host}${testRoute}`} 
            device={selectedDevice}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TestMobilePreview;
