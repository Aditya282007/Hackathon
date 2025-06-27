/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f5f4',
          100: '#d1e7dd',
          500: '#0b3d91',
          600: '#083a87',
          700: '#06337d'
        },
        accent: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};