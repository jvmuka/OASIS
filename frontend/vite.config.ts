import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O proxy /api -> localhost:3000 evita configurar CORS no navegador:
// o frontend chama /api/... e o Vite repassa para o backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
