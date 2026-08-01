import React from 'react';

const SAPageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
      <div>
        <h4 className="mb-1" style={{ fontWeight: 800, fontSize: '1.35rem' }}>{title}</h4>
        {subtitle && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  );
};

export default SAPageHeader;