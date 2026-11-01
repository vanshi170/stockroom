import React from 'react';

export function StockBadge({ status, quantity, minStock }) {
  if (status === 'OUT_OF_STOCK' || quantity === 0) {
    return <span className="badge badge-out-of-stock">Out of Stock</span>;
  }
  if (status === 'LOW_STOCK' || (minStock !== undefined && quantity <= minStock)) {
    return <span className="badge badge-low-stock">Low Stock ({quantity})</span>;
  }
  return <span className="badge badge-in-stock">In Stock ({quantity})</span>;
}

export function OrderStatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  if (s === 'RECEIVED') {
    return <span className="badge badge-po-received">Received</span>;
  }
  if (s === 'PENDING') {
    return <span className="badge badge-po-pending">Pending</span>;
  }
  if (s === 'CANCELLED') {
    return <span className="badge badge-po-cancelled">Cancelled</span>;
  }
  return <span className="badge badge-neutral">{status}</span>;
}

export function MovementTypeBadge({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('in') && !t.includes('out')) {
    return <span className="badge badge-in-stock">{type}</span>;
  }
  if (t.includes('out')) {
    return <span className="badge badge-out-of-stock">{type}</span>;
  }
  if (t.includes('po') || t.includes('purchase') || t.includes('received')) {
    return <span className="badge badge-po-received">{type}</span>;
  }
  return <span className="badge badge-neutral">{type}</span>;
}
