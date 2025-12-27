import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './cartContext';
import './index.css';
import './pokeholo.css';
import App from './App.tsx';

// Gestionnaire global pour les erreurs non capturées
window.addEventListener('unhandledrejection', (event) => {
  // Ignorer les erreurs liées aux extensions de navigateur
  const errorMessage = event.reason?.message || String(event.reason);
  if (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('Extension context invalidated')
  ) {
    event.preventDefault();
    return;
  }

  // Logger les autres erreurs pour le débogage
  console.error('Unhandled promise rejection:', event.reason);
});

// Gestionnaire pour les erreurs non capturées
window.addEventListener('error', (event) => {
  const errorMessage = event.message || String(event.error);
  if (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('Extension context invalidated')
  ) {
    event.preventDefault();
    return;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>
);
