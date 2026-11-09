import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { StoreProvider } from './store';
import App from './App';
import { requestPersistence } from './lib/storage';
import './styles.css';

registerSW({ immediate: true });
requestPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
