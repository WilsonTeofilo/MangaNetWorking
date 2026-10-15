import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fontes oficiais self-hosted — MangaNetWorking
import '@fontsource/anton';
import '@fontsource/bowlby-one';
import '@fontsource/silkscreen';
import '@fontsource-variable/archivo';

import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
