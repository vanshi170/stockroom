import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { StockBadge, MovementTypeBadge } from '../components/Badge';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Stock Adjustment Modal State
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    type: 'IN', // 'IN' | 'OUT'
    quantity: 1,
    note: '',
    error: null,
    isSubmitting: false,
  });

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProduct(id);
      setProduct(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // Load categories & suppliers for edit modal
    Promise.all([api.getCategories(), api.getSuppliers()])
      .then(([catRes, suppRes]) => {
        setCategories(catRes.data || []);
        setSuppliers(suppRes.data || []);
      })
      .catch((e) => console.error(e));
  }, [id]);

  const openEditModal = () => {
    setEditFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      price: product.price,
      minStockLevel: product.minStockLevel,
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setEditErrors({});
      await api.updateProduct(id, editFormData);
      setIsEditModalOpen(false);
      fetchProduct();
    } catch (err) {
      setEditErrors({ submit: err.message || 'Failed to update product' });
    } finally {
      setIsSaving(false);
    }
  };

  const openStockModal = (type) => {
    setStockModal({
      isOpen: true,
      type,
      quantity: 1,
      note: '',
      error: null,
      isSubmitting: false,
    });
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(stockModal.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setStockModal((prev) => ({ ...prev, error: 'Please enter a valid positive quantity' }));
      return;
    }
    if (stockModal.type === 'OUT' && qty > product.quantity) {
      setStockModal((prev) => ({
        ...prev,
        error: `Cannot remove ${qty} units. Current stock is only ${product.quantity}.`,
      }));
      return;
    }

    try {
      setStockModal((prev) => ({ ...prev, isSubmitting: true, error: null }));
      await api.adjustStock(id, {
        type: stockModal.type,
        quantity: qty,
        note: stockModal.note,
      });
      setStockModal({ isOpen: false, type: 'IN', quantity: 1, note: '', error: null, isSubmitting: false });
      fetchProduct();
    } catch (err) {
      setStockModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err.message || 'Failed to adjust stock',
      }));
    }
  };

  if (loading) return <div className="loading-box">Loading product details...</div>;
  if (error || !product) {
    return (
      <div className="surface-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <p className="form-error" style={{ marginBottom: '1rem' }}>{error || 'Product not found'}</p>
        <Link to="/products" className="btn btn-secondary">
          &larr; Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <Link to="/products" className="table-link text-muted">
          &larr; Back to Products
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <h1>{product.name}</h1>
            <StockBadge
              status={product.stockStatus}
              quantity={product.quantity}
              minStock={product.minStockLevel}
            />
          </div>
          <p className="font-mono text-muted">SKU: {product.sku}</p>
        </div>

        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => openStockModal('IN')}>
            + Add Stock
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => openStockModal('OUT')}
            disabled={product.quantity <= 0}
          >
            - Remove Stock
          </button>
          <button className="btn btn-primary" onClick={openEditModal}>
            Edit Product
          </button>
        </div>
      </div>

      {/* Product Details Grid */}
      <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
        <div className="surface-card-header">
          <h3>Specifications & Details</h3>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
            Last modified: {new Date(product.updatedAt).toLocaleDateString('en-IN')}
          </span>
        </div>
        <div className="surface-card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div>
              <span className="stat-label">Category</span>
              <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                {product.category?.name || '—'}
              </div>
            </div>

            <div>
              <span className="stat-label">Primary Supplier</span>
              <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                {product.supplier?.name || '—'}
              </div>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                {product.supplier?.email}
              </span>
            </div>

            <div>
              <span className="stat-label">Unit Price</span>
              <div className="font-mono" style={{ fontWeight: 600, fontSize: '1.2rem' }}>
                ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <span className="stat-label">Current Stock</span>
              <div className="font-mono" style={{ fontWeight: 600, fontSize: '1.2rem' }}>
                {product.quantity} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>units</span>
              </div>
            </div>

            <div>
              <span className="stat-label">Minimum Stock Threshold</span>
              <div className="font-mono" style={{ fontWeight: 500, fontSize: '1.1rem' }}>
                {product.minStockLevel} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>units</span>
              </div>
            </div>
          </div>

          {product.description && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span className="stat-label">Description</span>
              <p style={{ marginTop: '0.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stock Movement History for this product */}
      <div className="surface-card">
        <div className="surface-card-header">
          <h3>Stock Movement History</h3>
          <span className="text-muted font-mono" style={{ fontSize: '0.8rem' }}>
            {product.stockMovements?.length || 0} recorded transactions
          </span>
        </div>

        {(!product.stockMovements || product.stockMovements.length === 0) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No stock movements recorded yet for this item.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Movement Type</th>
                  <th className="num-col">Quantity</th>
                  <th className="num-col">Previous Stock</th>
                  <th className="num-col">New Stock</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {product.stockMovements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-muted font-mono" style={{ fontSize: '0.82rem' }}>
                      {new Date(m.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
        )}
      </div>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product">
        <form onSubmit={handleEditSubmit}>
          {editErrors.submit && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', borderRadius: 'var(--radius-sm)' }}>
              {editErrors.submit}
            </div>
          )}

          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              className="form-control"
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>SKU</label>
            <input
              type="text"
              className="form-control font-mono"
              value={editFormData.sku || ''}
              onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={editFormData.categoryId || ''}
                onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Supplier</label>
              <select
                className="form-control"
                value={editFormData.supplierId || ''}
                onChange={(e) => setEditFormData({ ...editFormData, supplierId: e.target.value })}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={editFormData.price || ''}
                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Min Stock Threshold</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={editFormData.minStockLevel || ''}
                onChange={(e) => setEditFormData({ ...editFormData, minStockLevel: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock In / Stock Out Modal */}
      <Modal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ ...stockModal, isOpen: false })}
        title={stockModal.type === 'IN' ? 'Add Inventory (Stock In)' : 'Dispatch Inventory (Stock Out)'}
      >
        <form onSubmit={handleStockSubmit}>
          {stockModal.error && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', borderRadius: 'var(--radius-sm)' }}>
              {stockModal.error}
            </div>
          )}

          <div style={{ marginBottom: '1rem', background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div>Current Stock: <strong className="font-mono">{product.quantity}</strong> units</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {stockModal.type === 'IN'
                ? 'Adds physical units directly to available inventory.'
                : 'Deducts physical units due to direct sale, damage, or customer fulfillment.'}
            </div>
          </div>

          <div className="form-group">
            <label>Quantity to {stockModal.type === 'IN' ? 'Add' : 'Remove'} <span className="required">*</span></label>
            <input
              type="number"
              min="1"
              max={stockModal.type === 'OUT' ? product.quantity : undefined}
              className="form-control"
              value={stockModal.quantity}
              onChange={(e) => setStockModal({ ...stockModal, quantity: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Movement Reason / Note</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Physical inventory adjustment, damage write-off, offline sale"
              value={stockModal.note}
              onChange={(e) => setStockModal({ ...stockModal, note: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStockModal({ ...stockModal, isOpen: false })}
              disabled={stockModal.isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={stockModal.type === 'OUT' ? 'btn btn-danger-solid' : 'btn btn-primary'}
              disabled={stockModal.isSubmitting}
            >
              {stockModal.isSubmitting
                ? 'Updating...'
                : stockModal.type === 'IN'
                ? 'Confirm Stock In'
                : 'Confirm Stock Out'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

