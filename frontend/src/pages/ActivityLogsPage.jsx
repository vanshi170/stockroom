import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Pagination from '../components/Pagination';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getActivityLogs({
        page: currentPage,
        limit,
        action: actionFilter,
        entityType: entityFilter,
        order: 'desc',
      });
      setConnected(res.connected !== false);
      setLogs(res.data || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch MongoDB activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionFilter, entityFilter]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1>Activity & Audit Logs</h1>
            <span
              className="badge"
              style={{
                backgroundColor: connected ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                color: connected ? 'var(--status-success-text)' : 'var(--status-danger-text)',
                borderColor: connected ? 'var(--status-success-border)' : 'var(--status-danger-border)',
              }}
            >
              {connected ? 'MongoDB Atlas Connected' : 'MongoDB Offline'}
            </span>
          </div>
          <p>
            Immutable event audit trail stored in MongoDB (Mongoose) documenting system mutations
          </p>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="toolbar-filters">
          <select
            className="select-input"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Actions</option>
            <option value="Product Created">Product Created</option>
            <option value="Product Updated">Product Updated</option>
            <option value="Product Deleted">Product Deleted</option>
            <option value="Stock Added">Stock Added</option>
            <option value="Stock Removed">Stock Removed</option>
            <option value="Purchase Order Created">Purchase Order Created</option>
            <option value="Purchase Order Received">Purchase Order Received</option>
            <option value="Supplier Created">Supplier Created</option>
          </select>

          <select
            className="select-input"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Entities</option>
            <option value="Product">Product</option>
            <option value="Supplier">Supplier</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
            <option value="StockMovement">StockMovement</option>
            <option value="Category">Category</option>
            <option value="System">System</option>
          </select>
        </div>
      </div>

      <div className="surface-card">
        {loading ? (
          <div className="loading-box">Querying MongoDB collections...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={fetchLogs}>Retry</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-title">No audit records found</h4>
            <p className="empty-text">Perform CRUD actions or stock updates to record activity.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Description</th>
                    <th>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-muted font-mono" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{log.action}</span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{log.entityType}</span>
                      </td>
                      <td className="font-mono text-muted">{log.entityId || '—'}</td>
                      <td>{log.description}</td>
                      <td>
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <pre
                            className="font-mono"
                            style={{
                              fontSize: '0.72rem',
                              background: 'var(--bg-surface-subtle)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '3px',
                              maxHeight: '60px',
                              overflow: 'auto',
                              margin: 0,
                            }}
                          >
                            {JSON.stringify(log.metadata, null, 1)}
                          </pre>
                        ) : (
                          '—'
                        )}
                      </td>
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

