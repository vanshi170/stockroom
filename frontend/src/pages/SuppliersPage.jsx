import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Supplier Modal
  const [viewSupplier, setViewSupplier] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    supplier: null,
    isDeleting: false,
    errorMessage: null,
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSuppliers(search);
      setSuppliers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const openAddModal = () => {
    setModalMode('add');
    setCurrentSupplier(null);
    setFormData({ name: '', contactPerson: '', email: '', phone: '', address: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setModalMode('edit');
    setCurrentSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openViewModal = async (supplierId) => {
    try {
      setLoadingDetail(true);
      const res = await api.getSupplier(supplierId);
      setViewSupplier(res.data);
    } catch (err) {
      alert(err.message || 'Failed to load supplier details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Supplier name is required';
    if (!formData.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Valid email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setFormErrors({});
      if (modalMode === 'add') {
        await api.createSupplier(formData);
      } else {
        await api.updateSupplier(currentSupplier.id, formData);
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to save supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (supplier) => {
    setDeleteDialog({
      isOpen: true,
      supplier,
      isDeleting: false,
      errorMessage: null,
    });
  };

  const confirmDelete = async () => {
    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true, errorMessage: null }));
      await api.deleteSupplier(deleteDialog.supplier.id);
      setDeleteDialog({ isOpen: false, supplier: null, isDeleting: false, errorMessage: null });
      fetchSuppliers();
    } catch (err) {
      setDeleteDialog((prev) => ({
        ...prev,
        isDeleting: false,
        errorMessage: err.message || 'Failed to delete supplier',
      }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Suppliers</h1>
          <p>Manage vendors, procurement channels, and contact details</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Supplier
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="toolbar-filters">
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search suppliers by name, contact, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="surface-card">
        {loading ? (
          <div className="loading-box">Loading suppliers...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={fetchSuppliers}>Retry</button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-title">No suppliers found</h4>
            <p className="empty-text">Add your primary vendors to organize purchase orders and products.</p>
            <button className="btn btn-primary" onClick={openAddModal}>+ Add Supplier</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="num-col">Products Supplied</th>
                  <th className="num-col">Purchase Orders</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span
                        className="table-link"
                        style={{ cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => openViewModal(s.id)}
                      >
                        {s.name}
                      </span>
                    </td>
                    <td>{s.contactPerson}</td>
                    <td><a href={`mailto:${s.email}`} className="table-link">{s.email}</a></td>
                    <td className="font-mono text-muted">{s.phone}</td>
                    <td className="num-col font-mono" style={{ fontWeight: 600 }}>{s.productsSuppliedCount}</td>
                    <td className="num-col font-mono">{s.purchaseOrdersCount}</td>
                    <td className="actions-cell">
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openViewModal(s.id)}>
                          View
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(s)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDeleteDialog(s)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}
      >
        <form onSubmit={handleSubmit}>
          {formErrors.submit && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', borderRadius: 'var(--radius-sm)' }}>
              {formErrors.submit}
            </div>
          )}

          <div className="form-group">
            <label>Supplier / Company Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Apex Hardware Logistics"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <span className="form-error">{formErrors.name}</span>}
          </div>

          <div className="form-group">
            <label>Contact Person <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Rajesh Sharma"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
            {formErrors.contactPerson && <span className="form-error">{formErrors.contactPerson}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="form-control"
                placeholder="rajesh@apexlogistics.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <span className="form-error">{formErrors.email}</span>}
            </div>

            <div className="form-group">
              <label>Phone Number <span className="required">*</span></label>
              <input
                type="text"
                className="form-control font-mono"
                placeholder="+91 98201 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Physical Address</label>
            <textarea
              className="form-control"
              placeholder="Warehouse address, industrial zone, city, state"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Supplier' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Supplier Details Modal */}
      <Modal
        isOpen={Boolean(viewSupplier)}
        onClose={() => setViewSupplier(null)}
        title={viewSupplier ? viewSupplier.name : 'Supplier Details'}
        size="lg"
      >
        {viewSupplier && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className="stat-label">Contact Person</span>
                <div style={{ fontWeight: 500 }}>{viewSupplier.contactPerson}</div>
              </div>
              <div>
                <span className="stat-label">Email & Phone</span>
                <div>{viewSupplier.email}</div>
                <div className="font-mono text-muted">{viewSupplier.phone}</div>
              </div>
              {viewSupplier.address && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span className="stat-label">Address</span>
                  <div style={{ fontSize: '0.88rem' }}>{viewSupplier.address}</div>
                </div>
              )}
            </div>

            <h4 style={{ marginBottom: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              Catalog Products ({viewSupplier.products?.length || 0})
            </h4>
            {(!viewSupplier.products || viewSupplier.products.length === 0) ? (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>No products registered under this supplier.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th className="num-col">Price</th>
                      <th className="num-col">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewSupplier.products.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td className="font-mono">{p.sku}</td>
                        <td>{p.category?.name || '—'}</td>
                        <td className="num-col font-mono">₹{p.price.toFixed(2)}</td>
                        <td className="num-col font-mono">{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message={
          deleteDialog.errorMessage ? (
            <span className="form-error" style={{ display: 'block' }}>
              {deleteDialog.errorMessage}
            </span>
          ) : (
            `Are you sure you want to delete supplier "${deleteDialog.supplier?.name}"?`
          )
        }
        isLoading={deleteDialog.isDeleting}
      />
    </div>
  );
}
