import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import RotateHint from './RotateHint.jsx';
import fitScreen from './fitScreen.js';
import './index.css';

fitScreen(); // 화면이 좁거나 납작하면(태블릿·휴대폰 가로) 배치를 줄여서 다 보이게

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
    <RotateHint />
  </React.StrictMode>,
);
