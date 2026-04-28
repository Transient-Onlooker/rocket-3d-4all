import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/rocket-3d-4all/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-three/drei')) {
            return 'r3f-drei';
          }

          if (id.includes('@react-three/fiber') || id.includes('three')) {
            return 'r3f-core';
          }

          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'charts';
          }

          return undefined;
        },
      },
    },
  },
}));
