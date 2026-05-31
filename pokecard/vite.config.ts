import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Découpage des dépendances lourdes en chunks séparés pour qu'elles
    // ne pèsent pas sur le bundle initial et soient mises en cache durablement.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
          stripe: ['@stripe/stripe-js'],
        },
      },
    },
    // Remonte le seuil d'alerte : les chunks 3D restent volumineux par nature.
    chunkSizeWarningLimit: 1200,
  },
});
