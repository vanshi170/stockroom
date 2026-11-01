import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { StockBadge } from '../components/Badge';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    supplierId: '',
    price: '',
    quantity: 0,
    minStockLevel: 5,
  });

  // Delete Confirm State
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    product: null,
    isDeleting: false,
    errorMessage: null,
  });

  // Load auxiliary data (categories & suppliers)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catsRes, suppsRes] = await Promise.all([
          api.getCategories(),
          api.getSuppliers(),
        ]);
        setCategories(catsRes.data || []);
        setSuppliers(suppsRes.data || []);
      } catch (e) {
        console.error('Failed to load categories/suppliers:', e);
      }
    };
    loadMetadata();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts({
        page: currentPage,
        limit,
        search,
        categoryId,
        stockStatus,
        sortBy,
        order,
      });

      setProducts(res.data || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, search, categoryId, stockStatus, sortBy, order]);

  // Form Handlers
  const openAddModal = () => {
    setModalMode('add');
    setCurrentProduct(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      supplierId: suppliers.length > 0 ? suppliers[0].id : '',
      price: '',
      quantity: 0,
      minStockLevel: 5,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      price: product.price,
      quantity: product.quantity,
      minStockLevel: product.minStockLevel,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.supplierId) errors.supplierId = 'Supplier is required';
    if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
      errors.price = 'Valid non-negative price is required';
    }
    if (modalMode === 'add') {
      if (formData.quantity === '' || isNaN(formData.quantity) || Number(formData.quantity) < 0) {
        errors.quantity = 'Initial stock quantity cannot be negative';
      }
    }
    if (formData.minStockLevel === '' || isNaN(formData.minStockLevel) || Number(formData.minStockLevel) < 0) {
      errors.minStockLevel = 'Minimum stock level must be positive';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      if (modalMode === 'add') {
        await api.createProduct(formData);
      } else {
        await api.updateProduct(currentProduct.id, {
          name: formData.name,
          sku: formData.sku,
          description: formData.description,
          categoryId: formData.categoryId,
          supplierId: formData.supplierId,
          price: formData.price,
          minStockLevel: formData.minStockLevel,
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err.message || 'Operation failed. Please review your input.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handlers
  const openDeleteDialog = (product) => {
    setDeleteDialog({
      isOpen: true,
      product,
      isDeleting: false,
      errorMessage: null,
    });
  };

  const confirmDelete = async () => {
    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true, errorMessage: null }));
      await api.deleteProduct(deleteDialog.product.id);
      setDeleteDialog({ isOpen: false, product: null, isDeleting: false, errorMessage: null });
      fetchProducts();
    } catch (err) {
      setDeleteDialog((prev) => ({
        ...prev,
        isDeleting: false,
        errorMessage: err.message || 'Failed to delete product',
      }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Products</h1>
          <p>Manage product catalog, SKUs, suppliers, and stock parameters</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Product
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="toolbar-card">
        <div className="toolbar-filters">
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, SKU or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="select-input"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="select-input"
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt; Min)</option>
            <option value="low_stock">Low Stock (&le; Min)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>

          <select
            className="select-input"
            value={`${sortBy}-${order}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('-');
              setSortBy(f);
              setOrder(o);
              setCurrentPage(1);
            }}
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="price-asc">Sort: Price (Low to High)</option>
            <option value="price-desc">Sort: Price (High to Low)</option>
            <option value="quantity-asc">Sort: Stock (Low to High)</option>
            <option value="quantity-desc">Sort: Stock (High to Low)</option>
            <option value="createdAt-desc">Sort: Recently Added</option>
          </select>
        </div>
      </div>

      {/* Product Table Card */}
      <div className="surface-card">
        {loading ? (
          <div className="loading-box">Loading products...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={fetchProducts}>Retry</button>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-title">No products found</h4>
            <p className="empty-text">Try adjusting your search criteria or add your first product.</p>
            <button className="btn btn-primary" onClick={openAddModal}>+ Add Product</button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th className="num-col">Unit Price</th>
                    <th className="num-col">Quantity</th>
                    <th>Stock Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link to={`/products/${product.id}`} className="table-link">
                          {product.name}
                        </Link>
                      </td>
                      <td>
                        <span className="font-mono">{product.sku}</span>
                      </td>
                      <td>{product.category?.name || '—'}</td>
                      <td>{product.supplier?.name || '—'}</td>
                      <td className="num-col font-mono">
                        ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="num-col font-mono" style={{ fontWeight: 600 }}>
                        {product.quantity}
                      </td>
                      <td>
                        <StockBadge
                          status={product.stockStatus}
                          quantity={product.quantity}
                          minStock={product.minStockLevel}
                        />
                      </td>
                      <td className="actions-cell">
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <Link to={`/products/${product.id}`} className="btn btn-secondary btn-sm">
                            View
                          </Link>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(product)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => openDeleteDialog(product)}
                          >
                            Delete
                          </button>
                        </div>
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Product' : 'Edit Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {formErrors.submit && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              {formErrors.submit}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Product Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Wireless Ergonomic Mouse"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>

            <div className="form-group">
              <label>SKU (Stock Keeping Unit) <span className="required">*</span></label>
              <input
                type="text"
                className="form-control font-mono"
                placeholder="e.g. ELEC-MOU-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              />
              {formErrors.sku && <span className="form-error">{formErrors.sku}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              placeholder="Brief specification or details about this product..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && <span className="form-error">{formErrors.categoryId}</span>}
            </div>

            <div className="form-group">
              <label>Supplier <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {formErrors.supplierId && <span className="form-error">{formErrors.supplierId}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit Price (₹) <span className="required">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
              {formErrors.price && <span className="form-error">{formErrors.price}</span>}
            </div>

            <div className="form-group">
              <label>Minimum Stock Threshold <span className="required">*</span></label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="5"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
              />
              <span className="form-hint">Alert triggers when inventory is at or below this count.</span>
              {formErrors.minStockLevel && <span className="form-error">{formErrors.minStockLevel}</span>}
            </div>
          </div>

          {modalMode === 'add' && (
            <div className="form-group">
              <label>Initial Stock Quantity</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
              <span className="form-hint">Initial inventory entered will be recorded as opening Stock In.</span>
              {formErrors.quantity && <span className="form-error">{formErrors.quantity}</span>}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={
          deleteDialog.errorMessage ? (
            <span className="form-error" style={{ display: 'block' }}>
              {deleteDialog.errorMessage}
            </span>
          ) : (
            `Are you sure you want to delete "${deleteDialog.product?.name}" (SKU: ${deleteDialog.product?.sku})? This cannot be undone.`
          )
        }
        isLoading={deleteDialog.isDeleting}
        confirmText="Confirm Delete"
      />
    </div>
  );
}

