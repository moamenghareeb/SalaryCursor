import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface DeviceSpec {
  name: string;
  width: number;
  height: number;
}

interface MobileEmulatorProps {
  url?: string;
  device?: DeviceSpec;
  width?: number;
  height?: number;
  deviceName?: string;
  orientation?: 'portrait' | 'landscape';
  children?: ReactNode;
}

export default function MobileEmulator({
  url,
  device,
  width = 375,
  height = 667,
  deviceName,
  orientation = 'portrait',
  children
}: MobileEmulatorProps) {
  // Use device specs if provided
  const deviceWidth = device?.width || width;
  const deviceHeight = device?.height || height;
  const deviceDisplayName = deviceName || device?.name || 'iPhone SE';
  const [isRotated, setIsRotated] = useState(orientation === 'landscape');
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get actual dimensions based on orientation
  const actualWidth = isRotated ? deviceHeight : deviceWidth;
  const actualHeight = isRotated ? deviceWidth : deviceHeight;
  
  // Calculate scale to fit the container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateScale = () => {
      const containerWidth = containerRef.current?.clientWidth || 1;
      const containerHeight = containerRef.current?.clientHeight || 1;
      
      // Calculate the scale needed to fit the device within the container
      // while maintaining aspect ratio
      const widthScale = (containerWidth - 60) / actualWidth;
      const heightScale = (containerHeight - 60) / actualHeight;
      
      // Use the smaller scale to ensure device fits inside container
      const newScale = Math.min(widthScale, heightScale, 1);
      setScale(newScale);
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [actualWidth, actualHeight, isRotated]);
  
  // Toggle orientation
  const toggleOrientation = () => {
    setIsRotated(!isRotated);
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {deviceDisplayName} {isRotated ? '(Landscape)' : '(Portrait)'}
          <span className="ml-2 text-gray-500 dark:text-gray-400">
            {actualWidth}×{actualHeight}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleOrientation}
            className="p-2 text-xs rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            title="Rotate device"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => window.open(url, '_blank')}
            className="p-2 text-xs rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            title="Open in new tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex items-center justify-center w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
      >
        <div className={`relative transition-all duration-300 ${isRotated ? 'rotate-90' : ''}`} style={{ transform: `scale(${scale})` }}>
          {/* Device frame */}
          <div 
            className={`relative border-[12px] border-gray-900 rounded-[36px] bg-white overflow-hidden shadow-xl`}
            style={{ width: actualWidth, height: actualHeight }}
          >
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black z-10">
              <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-4">
                <span className="text-[10px] text-white">10:30</span>
                <div className="flex items-center space-x-1">
                  <span className="block w-3 h-3 rounded-full bg-white opacity-80"></span>
                  <span className="block w-3 h-3 rounded-full bg-white opacity-80"></span>
                  <span className="block w-3 h-3 rounded-full bg-white opacity-80"></span>
                </div>
              </div>
            </div>
            
            {/* Home indicator for modern iPhones */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-center">
              <div className="w-24 h-1 bg-black rounded-full opacity-20"></div>
            </div>
            
            {/* Content - either iframe or children */}
            {url ? (
              <iframe 
                src={url} 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  marginTop: '0px'
                }}
                className="border-0"
                title="Mobile device emulator"
              />
            ) : (
              <div className="absolute inset-0 pt-6 overflow-auto">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
