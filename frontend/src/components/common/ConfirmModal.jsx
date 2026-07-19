import React from 'react';
import { useTranslation } from 'react-i18next';
import { BiX, BiLogOut, BiTrash } from 'react-icons/bi';

const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmText, cancelText, variant = 'primary' }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="modal-premium" onClick={onClose}>
      <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-premium-header">
          <h5>{title}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="modal-premium-body text-center">
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: variant === 'danger' ? 'var(--glow-danger)' : 'var(--glow-primary)',
            color: variant === 'danger' ? 'var(--danger)' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 1.25rem',
          }}>
            {variant === 'danger' ? <BiLogOut /> : <BiTrash />}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div className="modal-premium-footer" style={{ justifyContent: 'center', gap: '0.75rem' }}>
          <button className="btn-premium btn-premium-secondary" onClick={onClose}>
            {cancelText || t('common.cancel')}
          </button>
          <button
            className={`btn-premium ${variant === 'danger' ? 'btn-premium-danger' : 'btn-premium-primary'}`}
            onClick={onConfirm}
          >
            {confirmText || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
