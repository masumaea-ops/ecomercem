
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Global typing for stashed PWA prompt
declare global {
  interface Window {
    deferredPWAInstallPrompt?: any;
  }
}

// 1. Immediate capture of beforeinstallprompt lifecycle
window.addEventListener('beforeinstallprompt', (e) => {
  // Suppress default native prompt banner
  e.preventDefault();
  // Stash event globally for programmatic trigger
  window.deferredPWAInstallPrompt = e;
  // Notify listeners the millisecond event fires
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
});

// 2. High-performance Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for updates on subsequent visits
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version ready; activates seamlessly via skipWaiting()');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[PWA] SW registration ignored:', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </HelmetProvider>
  </React.StrictMode>
);
