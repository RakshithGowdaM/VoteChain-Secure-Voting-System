import React from 'react';
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { VoteProvider } from './context/VoteContext';
import TopBar from './components/TopBar';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import VerifyPage from './pages/VerifyPage';
import AdminPage from './pages/AdminPage';
import './styles/global.css';

export default function App() {
  return (
    <VoteProvider>
      <BrowserRouter>
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161b28',
              color: '#e2e8f0',
              border: '0.5px solid rgba(99,179,237,0.25)',
              fontFamily: "'Syne', sans-serif",
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0a0d12' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0d12' } },
          }}
        />
      </BrowserRouter>
    </VoteProvider>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 32px' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: '0.15em', color: '#60a5fa', marginBottom: 12 }}>404 — NOT FOUND</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Page not found</h1>
      <Link to="/" style={{ color: '#60a5fa', fontSize: 14 }}>← Back to voting</Link>
    </div>
  );
}
