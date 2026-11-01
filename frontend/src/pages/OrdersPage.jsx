import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { OrderStatusBadge } from '../components/Badge';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Create Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { productId: '', quantity: 1, unitPrice: 0, subtotal: 0 },
  ]);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Order Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    Promise.all([api.getSuppliers(), api.getProducts({ limit: 100 })])
      .then(([suppRes, prodRes]) => {
        setSuppliers(suppRes.data || []);
        setProducts(prodRes.data || []);
      })
      .catch((e) => console.error(e));
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getOrders({
        page: currentPage,
        limit,
        status: statusFilter,
        supplierId: supplierFilter,
      });
      setOrders(res.data || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, supplierFilter]);

  // Create Order Handlers
  const openCreateModal = () => {
    setOrderSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setOrderItems([{ productId: products.length > 0 ? products[0].id : '', quantity: 5, unitPrice: products.length > 0 ? products[0].price : 0, subtotal: 0 }]);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleProductChange = (index, prodId) => {
    const p = products.find((prod) => prod.id === parseInt(prodId, 10));
    const newItems = [...orderItems];
    newItems[index].productId = prodId;
    if (p) {
      newItems[index].unitPrice = p.price;
      newItems[index].subtotal = newItems[index].quantity * p.price;
    }
    setOrderItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const val = parseInt(qty, 10) || 0;
    const newItems = [...orderItems];
    newItems[index].quantity = val;
    newItems[index].subtotal = val * (parseFloat(newItems[index].unitPrice) || 0);
    setOrderItems(newItems);
  };

  const handleUnitPriceChange = (index, price) => {
    const val = parseFloat(price) || 0;
    const newItems = [...orderItems];
    newItems[index].unitPrice = val;
    newItems[index].subtotal = (parseInt(newItems[index].quantity, 10) || 0) * val;
    setOrderItems(newItems);
  };

  const addItemRow = () => {
    setOrderItems([
      ...orderItems,
      {
        productId: products.length > 0 ? products[0].id : '',
        quantity: 1,
        unitPrice: products.length > 0 ? products[0].price : 0,
        subtotal: products.length > 0 ? products[0].price : 0,
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const totalOrderAmount = orderItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!orderSupplierId) {
      setFormError('Please select a supplier');
      return;
    }

    if (orderItems.length === 0) {
      setFormError('Add at least one item');
      return;
    }

    for (const item of orderItems) {
      if (!item.productId) {
        setFormError('All item rows must have a selected product');
        return;
      }
      if (item.quantity <= 0) {
        setFormError('Item quantities must be greater than zero');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await api.createOrder({
        supplierId: orderSupplierId,
        items: orderItems.map((item) => ({
          productId: parseInt(item.productId, 10),
          quantity: parseInt(item.quantity, 10),
          unitPrice: parseFloat(item.unitPrice),
        })),
      });
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change (Receive / Cancel)
  const handleUpdateStatus = async (orderId, newStatus) => {
    if (newStatus === 'RECEIVED') {
      const confirmReceive = window.confirm(
        'Confirm receiving this order? Stock quantities for all products in this order will be automatically incremented in a safe transaction.'
      );
      if (!confirmReceive) return;
    } else if (newStatus === 'CANCELLED') {
      const confirmCancel = window.confirm('Are you sure you want to cancel this purchase order?');
      if (!confirmCancel) return;
    }

    try {
      setIsUpdatingStatus(true);
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(res.data);
      }
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Purchase Orders</h1>
          <p>Procure stock from suppliers, generate line items, and receive inventory</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Create Purchase Order
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="toolbar-filters">
          <select
            className="select-input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="select-input"
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="surface-card">
        {loading ? (
          <div className="loading-box">Loading purchase orders...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={fetchOrders}>Retry</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-title">No purchase orders found</h4>
            <p className="empty-text">Create purchase orders to order fresh inventory from suppliers.</p>
            <button className="btn btn-primary" onClick={openCreateModal}>+ Create Purchase Order</button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Supplier</th>
                    <th>Date Placed</th>
                    <th className="num-col">Total Units</th>
                    <th className="num-col">Total Amount</th>
                    <th>Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.id}>
                      <td>
                        <span
                          className="table-link font-mono"
                          style={{ cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => setSelectedOrder(po)}
                        >
                          PO-{String(po.id).padStart(4, '0')}
                        </span>
                      </td>
                      <td>{po.supplier?.name}</td>
                      <td className="text-muted font-mono" style={{ fontSize: '0.82rem' }}>
                        {new Date(po.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="num-col font-mono">{po.totalUnits}</td>
                      <td className="num-col font-mono" style={{ fontWeight: 600 }}>
                        ₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <OrderStatusBadge status={po.status} />
                      </td>
                      <td className="actions-cell">
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedOrder(po)}
                          >
                            Details
                          </button>
                          {po.status === 'PENDING' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateStatus(po.id, 'RECEIVED')}
                                disabled={isUpdatingStatus}
                              >
                                Mark Received
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleUpdateStatus(po.id, 'CANCELLED')}
                                disabled={isUpdatingStatus}
                              >
                                Cancel
                              </button>
                            </>
                          )}
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

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Order"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit}>
          {formError && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', borderRadius: 'var(--radius-sm)' }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label>Vendor / Supplier <span className="required">*</span></label>
            <select
              className="form-control"
              value={orderSupplierId}
              onChange={(e) => setOrderSupplierId(e.target.value)}
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contactPerson})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.95rem' }}>Order Items</h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
              + Add Item Row
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '1rem' }}>
            {orderItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr auto',
                  gap: '0.6rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  paddingBottom: '0.5rem',
                  borderBottom: idx !== orderItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Product</label>
                  <select
                    className="form-control"
                    value={item.productId}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Qty</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control font-mono"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control font-mono"
                    value={item.unitPrice}
                    onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Subtotal (₹)</label>
                  <div className="font-mono" style={{ fontWeight: 600, padding: '0.5rem 0' }}>
                    ₹{(item.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label style={{ visibility: 'hidden', display: 'block', fontSize: '0.72rem' }}>X</label>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => removeItemRow(idx)}
                    disabled={orderItems.length === 1}
                    title="Remove item"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'right', padding: '0.75rem', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Calculated Total: </span>
            <strong className="font-mono" style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
              ₹{totalOrderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Order...' : 'Submit Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Order Details Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Purchase Order PO-${String(selectedOrder.id).padStart(4, '0')}` : 'Order Details'}
        size="lg"
      >
        {selectedOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className="stat-label">Supplier</span>
                <div style={{ fontWeight: 600 }}>{selectedOrder.supplier?.name}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{selectedOrder.supplier?.contactPerson}</div>
              </div>

              <div>
                <span className="stat-label">Status</span>
                <div>
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>

              <div>
                <span className="stat-label">Total Amount</span>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <h4 style={{ marginBottom: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              Line Items ({selectedOrder.items?.length || 0})
            </h4>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="num-col">Quantity</th>
                    <th className="num-col">Unit Price</th>
                    <th className="num-col">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.product?.name}</td>
                      <td><span className="font-mono">{item.product?.sku}</span></td>
                      <td className="num-col font-mono" style={{ fontWeight: 600 }}>{item.quantity}</td>
                      <td className="num-col font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="num-col font-mono" style={{ fontWeight: 600 }}>
                        ₹{Number(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder.status === 'PENDING' && (
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                  disabled={isUpdatingStatus}
                >
                  Cancel Order
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'RECEIVED')}
                  disabled={isUpdatingStatus}
                >
                  Confirm Receipt & Increment Stock
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
