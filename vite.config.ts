import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/rocket-3d-4all/' : '/',
  plugins: [react()],
}));
