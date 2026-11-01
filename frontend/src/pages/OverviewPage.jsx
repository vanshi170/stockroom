import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StockBadge, MovementTypeBadge } from '../components/Badge';

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getOverview();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return <div className="loading-box">Loading inventory overview...</div>;
  }

  if (error) {
    return (
      <div className="surface-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchOverview}>Retry</button>
      </div>
    );
  }

  const { summary, lowStockItems, recentMovements, recentlyAddedProducts } = data;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Inventory Overview</h1>
          <p>Real-time status of products, stock levels, and warehouse operations</p>
        </div>
        <div className="page-actions">
          <Link to="/products" className="btn btn-secondary btn-sm">
            View All Products
          </Link>
          <Link to="/orders" className="btn btn-primary btn-sm">
            + Purchase Order
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Products</span>
          <span className="stat-value">{summary.totalProducts}</span>
          <span className="stat-subtext">Active catalog items</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Stock Units</span>
          <span className="stat-value">{summary.totalStockUnits.toLocaleString()}</span>
          <span className="stat-subtext">Total physical units in stock</span>
        </div>

        <div className={`stat-card ${summary.lowStockCount > 0 ? 'alert-card' : ''}`}>
          <span className="stat-label">Low Stock Items</span>
          <span className="stat-value">{summary.lowStockCount}</span>
          <span className="stat-subtext">Items at or below reorder threshold</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Suppliers</span>
          <span className="stat-value">{summary.totalSuppliers}</span>
          <span className="stat-subtext">Registered vendors</span>
        </div>
      </div>

      {/* Low Stock Section */}
      <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
        <div className="surface-card-header">
          <div>
            <h3>Low & Out of Stock Alert</h3>
            <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '2px' }}>
              Products that have reached or fallen below minimum safety inventory
            </p>
          </div>
          <span className="badge badge-low-stock">{lowStockItems.length} items require attention</span>
        </div>

        {lowStockItems.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            All product inventory levels are currently above minimum safety thresholds.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th className="num-col">Current Stock</th>
                  <th className="num-col">Min Required</th>
                  <th>Status</th>
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/products/${item.id}`} className="table-link">
                        {item.name}
                      </Link>
                    </td>
                    <td><span className="font-mono">{item.sku}</span></td>
                    <td>{item.category?.name || '—'}</td>
                    <td>{item.supplier?.name || '—'}</td>
                    <td className="num-col font-mono" style={{ fontWeight: 600 }}>{item.quantity}</td>
                    <td className="num-col font-mono text-muted">{item.minStockLevel}</td>
                    <td>
                      <StockBadge quantity={item.quantity} minStock={item.minStockLevel} />
                    </td>
                    <td className="actions-cell">
                      <Link to={`/products/${item.id}`} className="btn btn-secondary btn-sm">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2 Columns: Recent Stock Activity & Recently Added Products */}
      <div className="grid-cols-2">
        {/* Recent Stock Activity */}
        <div className="surface-card">
          <div className="surface-card-header">
            <h3>Recent Stock Activity</h3>
            <Link to="/history" className="table-link" style={{ fontSize: '0.82rem' }}>
              View History &rarr;
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No stock movements recorded yet.
            </div>
          ) : (
            <ul className="simple-list">
              {recentMovements.map((m) => (
                <li key={m.id} className="simple-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MovementTypeBadge type={m.type} />
                      <Link to={`/products/${m.product.id}`} className="table-link">
                        {m.product.name}
                      </Link>
                    </div>
                    <span className="text-muted font-mono" style={{ fontSize: '0.78rem' }}>
                      {m.note || 'No notes attached'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      {m.type === 'Stock Out' ? `-${m.quantity}` : `+${m.quantity}`} units
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {new Date(m.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recently Added Products */}
        <div className="surface-card">
          <div className="surface-card-header">
            <h3>Recently Added Products</h3>
            <Link to="/products" className="table-link" style={{ fontSize: '0.82rem' }}>
              All Products &rarr;
            </Link>
          </div>
          {recentlyAddedProducts.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No products found in catalog.
            </div>
          ) : (
            <ul className="simple-list">
              {recentlyAddedProducts.map((p) => (
                <li key={p.id} className="simple-list-item">
                  <div>
                    <Link to={`/products/${p.id}`} className="table-link" style={{ display: 'block' }}>
                      {p.name}
                    </Link>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                      <span className="font-mono">{p.sku}</span> &bull; {p.category?.name}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontWeight: 500 }}>
                      ₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {p.quantity} in stock
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

