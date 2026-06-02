import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Découpage des dépendances lourdes en chunks vendor stables, mis en cache
    // durablement et séparés du code applicatif (qui change à chaque déploiement).
    // La forme fonction est nécessaire pour capturer react-dom/client (createRoot),
    // que la forme tableau ['react-dom'] laissait fuir dans le bundle d'entrée.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion') || id.includes('/motion-dom/')) return 'motion';
          if (id.includes('@stripe')) return 'stripe';
          // Coeur React (react + react-dom + scheduler + router) regroupé.
          if (
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/react-router') ||
            /[\\/]react[\\/]/.test(id)
          ) {
            return 'react-vendor';
          }
          // @paper-design (shader LiquidMetal) laissé non routé : il reste ainsi
          // dans son chunk dynamique (chargé à la demande).
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
