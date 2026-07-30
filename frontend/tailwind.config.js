/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { navy: { DEFAULT: '#1F3864', light: '#2d4a80' } },
    },
  },
  plugins: [],
};
