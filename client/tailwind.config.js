/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#10152F',
          purple: '#7138F5',
          cyan: '#00D5FF',
          light: '#F5F7FC',
          dark: '#0B0E1F',
          cardDark: '#151A38',
          borderDark: '#23294C'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 20px -2px rgba(113, 56, 245, 0.15)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'premium': '0 10px 30px -5px rgba(16, 21, 47, 0.08)'
      }
    },
  },
  plugins: [],
}
