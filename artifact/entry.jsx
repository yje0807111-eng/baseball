import React from 'react';
import KboAugmentDraft from '../src/KboAugmentDraft.jsx';

const el = document.getElementById('root');
if (window.ReactDOM.createRoot) window.ReactDOM.createRoot(el).render(<KboAugmentDraft />);
else window.ReactDOM.render(<KboAugmentDraft />, el);
