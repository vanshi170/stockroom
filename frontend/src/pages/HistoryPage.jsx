import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Pagination from '../components/Pagination';
import { MovementTypeBadge } from '../components/Badge';

export default function HistoryPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 15;

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getStockMovements({
        page: currentPage,
        limit,
        search,
        type: typeFilter,
      });
      setMovements(res.data || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch stock movements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [currentPage, search, typeFilter]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Stock History</h1>
          <p>Chronological ledger of inventory arrivals, customer fulfillments, and purchase orders</p>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="toolbar-filters">
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="select-input"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Movement Types</option>
            <option value="in">Stock In (Manual / Opening)</option>
            <option value="out">Stock Out (Dispatched / Sale)</option>
            <option value="po">Purchase Order Received</option>
          </select>
        </div>
      </div>

      <div className="surface-card">
        {loading ? (
          <div className="loading-box">Loading movement history...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={fetchMovements}>Retry</button>
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-title">No stock movements found</h4>
            <p className="empty-text">No recorded stock transactions match your current search criteria.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Movement Type</th>
                    <th className="num-col">Quantity</th>
                    <th className="num-col">Previous Stock</th>
                    <th className="num-col">New Stock</th>
                    <th>Note / Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="text-muted font-mono" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <Link to={`/products/${m.product?.id}`} className="table-link">
                          {m.product?.name}
                        </Link>
                      </td>
                      <td>
                        <span className="font-mono">{m.product?.sku}</span>
                      </td>
                      <td>
                        <MovementTypeBadge type={m.type} />
                      </td>
                      <td className="num-col font-mono" style={{ fontWeight: 600 }}>
                        {m.type === 'Stock Out' ? `-${m.quantity}` : `+${m.quantity}`}
                      </td>
                      <td className="num-col font-mono text-muted">{m.previousStock}</td>
                      <td className="num-col font-mono" style={{ fontWeight: 600 }}>
                        {m.newStock}
                      </td>
                      <td>{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </>
        )}
      </div>
    </div>
  );
}
