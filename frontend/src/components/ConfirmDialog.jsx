import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '0.92rem' }}>
        {message}
      </p>
      <div className="modal-footer" style={{ margin: '-1.25rem -1.25rem -1.25rem -1.25rem', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </button>
        <button
          className={isDanger ? 'btn btn-danger-solid' : 'btn btn-primary'}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}

