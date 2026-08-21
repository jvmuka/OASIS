/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#dde6f1',
          200: '#bfd2e5',
          300: '#94b5d4',
          400: '#6392bf',
          500: '#4175a9',
          600: '#2d5b8c',
          700: '#254972',
          800: '#1f3864',
          900: '#0f2b48',
          DEFAULT: '#1f3864',
          light: '#2d4a80',
          dark: '#0f2b48',
        },
        brand: {
          blue: '#2563eb',
          cyan: '#0ea5e9',
          indigo: '#4f46e5',
          teal: '#0d9488',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(15, 43, 72, 0.05), 0 1px 4px -1px rgba(15, 43, 72, 0.03)',
        'card': '0 4px 20px -2px rgba(15, 43, 72, 0.06), 0 2px 6px -1px rgba(15, 43, 72, 0.03)',
        'card-hover': '0 10px 25px -3px rgba(15, 43, 72, 0.1), 0 4px 10px -2px rgba(15, 43, 72, 0.04)',
        'modal': '0 25px 50px -12px rgba(15, 43, 72, 0.25)',
      },
    },
  },
  plugins: [],
};
