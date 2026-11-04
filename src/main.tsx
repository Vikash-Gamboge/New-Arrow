import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// On native Android (Capacitor WebView), assets are already bundled locally inside the APK.
// Unregister any stale Service Workers so Workbox never caches old JS bundles or blocks Capacitor's native bridge.
if (Capacitor.isNativePlatform()) {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      })
      .catch(() => {});
  }
  if (typeof window !== 'undefined' && 'caches' in window) {
    caches
      .keys()
      .then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      })
      .catch(() => {});
  }
} else {
  // Register PWA Service Worker for web browser offline play
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(<App />);
