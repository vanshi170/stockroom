import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../services/api';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState({ postgres: false, mongo: false });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.checkHealth();
        setDbStatus({
          postgres: res.databases?.postgresql?.connected || false,
          mongo: res.databases?.mongodb?.connected || false,
        });
      } catch (err) {
        setDbStatus({ postgres: false, mongo: false });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="top-header">
      <div className="nav-container">
        <NavLink to="/" className="brand-section" onClick={closeMenu}>
          <span className="brand-badge">S</span>
          <span>Stockroom</span>
        </NavLink>

        <nav className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end onClick={closeMenu}>
            Overview
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            Products
          </NavLink>
          <NavLink to="/suppliers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            Suppliers
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            Purchase Orders
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            Stock History
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            Activity Logs
          </NavLink>
        </nav>

        <div className="nav-extra">
          <div className="db-pill" title="PostgreSQL (Supabase/Prisma) Status">
            <span className={`status-dot ${dbStatus.postgres ? 'active' : ''}`} />
            <span>PG</span>
          </div>
          <div className="db-pill" title="MongoDB (Atlas/Mongoose) Status">
            <span className={`status-dot ${dbStatus.mongo ? 'active' : ''}`} />
            <span>Mongo</span>
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

