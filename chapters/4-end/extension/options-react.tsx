import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/layout';

const App = () => {
  return (
    <Layout />
  );
};

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
}