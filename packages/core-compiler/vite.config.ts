import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  root: __dirname,
  server: {
    port: 8081,
    host: '::',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './demo'),
    },
  },
});
