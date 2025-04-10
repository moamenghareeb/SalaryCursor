const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// iOS icon sizes
const iosIcons = [
  { size: 180, name: 'apple-icon-180.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// iOS splash screen sizes
const iosSplashScreens = [
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.jpg' },
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.jpg' },
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048.jpg' },
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.jpg' },
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.jpg' },
  { width: 828, height: 1792, name: 'apple-splash-828-1792.jpg' },
  { width: 750, height: 1334, name: 'apple-splash-750-1334.jpg' },
  { width: 640, height: 1136, name: 'apple-splash-640-1136.jpg' },
];

// Check if ImageMagick is installed
exec('convert -version', (error) => {
  if (error) {
    console.error('ImageMagick is required but not installed. Please install ImageMagick first.');
    console.error('On macOS: brew install imagemagick');
    console.error('On Ubuntu: sudo apt-get install imagemagick');
    process.exit(1);
  }

  // Generate icons
  const sourceIcon = path.join(__dirname, '../public/app-icon.png');
  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found. Please place app-icon.png in the public directory.');
    process.exit(1);
  }

  console.log('Generating icons...');
  iosIcons.forEach(({ size, name }) => {
    const output = path.join(iconsDir, name);
    exec(`convert "${sourceIcon}" -resize ${size}x${size} "${output}"`, (error) => {
      if (error) {
        console.error(`Error generating ${name}:`, error);
      } else {
        console.log(`Generated ${name}`);
      }
    });
  });

  // Generate splash screens
  console.log('Generating splash screens...');
  const splashBackground = '#ffffff'; // Match your app's background color
  iosSplashScreens.forEach(({ width, height, name }) => {
    const output = path.join(iconsDir, name);
    // Create a splash screen with the app icon centered
    exec(
      `convert -size ${width}x${height} xc:${splashBackground} \\
      \\( "${sourceIcon}" -resize $((width / 3))x$((height / 3)) \\) -gravity center -composite \\
      "${output}"`,
      (error) => {
        if (error) {
          console.error(`Error generating ${name}:`, error);
        } else {
          console.log(`Generated ${name}`);
        }
      }
    );
  });
}); 