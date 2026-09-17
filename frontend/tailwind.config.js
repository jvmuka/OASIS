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
          950: '#09182b',
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
        oasis: {
          sand: '#fbfaf8',
          limestone: '#f3f1eb',
          clay: '#e3dfd7',
          stone: '#57534e',
          night: '#0a0f1d',
          deep: '#0e1726',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(15, 43, 72, 0.05), 0 1px 4px -1px rgba(15, 43, 72, 0.03)',
        'card': '0 4px 20px -2px rgba(15, 43, 72, 0.06), 0 2px 6px -1px rgba(15, 43, 72, 0.03)',
        'card-hover': '0 12px 28px -4px rgba(15, 43, 72, 0.12), 0 4px 10px -2px rgba(15, 43, 72, 0.04)',
        'elevated': '0 20px 30px -8px rgba(15, 43, 72, 0.14), 0 8px 12px -4px rgba(15, 43, 72, 0.06)',
        'glass': '0 8px 32px 0 rgba(15, 43, 72, 0.08)',
        'glow-blue': '0 0 24px -2px rgba(37, 99, 235, 0.28)',
        'glow-emerald': '0 0 24px -2px rgba(16, 185, 129, 0.28)',
        'modal': '0 25px 50px -12px rgba(15, 43, 72, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.88', transform: 'scale(1.015)' },
        },
      },
    },
  },
  plugins: [],
};
