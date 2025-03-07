/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          gray: {
            light: '#f5f5f7',
            DEFAULT: '#86868b',
            dark: '#1d1d1f',
          },
          blue: '#0071e3',
          'blue-hover': '#0077ED',
          black: '#000000',
          white: '#ffffff',
        },
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro"',
          '-apple-system',
          'BlinkMacSystemFont',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'apple-nav': '0 1px 2px rgba(0, 0, 0, 0.08)',
        'apple-card': '0 4px 8px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'apple': '12px', // Apple's typical rounded corners
      },
    },
  },
  plugins: [],
} 