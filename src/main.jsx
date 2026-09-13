import React from 'react';
import { createRoot } from 'react-dom/client';
import KboAugmentDraft from './KboAugmentDraft.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KboAugmentDraft />
  </React.StrictMode>,
);
