import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import OverviewPage from './pages/OverviewPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import SuppliersPage from './pages/SuppliersPage';
import OrdersPage from './pages/OrdersPage';
import HistoryPage from './pages/HistoryPage';
import ActivityLogsPage from './pages/ActivityLogsPage';

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/logs" element={<ActivityLogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <strong>Stockroom</strong> &bull; Simple Inventory Management System (College Project Week 17–18)
          </div>
          <div className="font-mono text-muted">
            PostgreSQL &bull; Prisma ORM &bull; MongoDB Atlas &bull; Express REST API
          </div>
        </div>
      </footer>
    </div>
  );
}
