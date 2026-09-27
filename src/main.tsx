import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Vorgerendertes HTML (siehe scripts/build-all.mjs) wird hydriert, sonst normal gerendert
if (container.firstElementChild) hydrateRoot(container, app);
else createRoot(container).render(app);
