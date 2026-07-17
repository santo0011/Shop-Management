import React from 'react';

// Shared stat/summary tile — icon fixed on the left, value beside it,
// title directly below the value. Every page that needs a summary card
// must render this component instead of copy-pasting the markup, so the
// Admin Dashboard and Sales page (and anywhere else) stay pixel-identical.
const StatCard = ({ icon: Icon, label, value, color = 'primary' }) => (
  <div className={`stat-card stat-card-modern stat-${color}`} style={{ padding: '1.15rem 1.25rem', cursor: 'default' }}>
    <div className="d-flex align-items-center gap-3">
      <div
        className="stat-icon-wrapper"
        style={{ width: '40px', height: '40px', fontSize: '1.2rem', marginBottom: 0, flexShrink: 0 }}
      >
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          className="stat-value"
          style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '2px', lineHeight: 1.2 }}
        >
          {value}
        </div>
        <div
          className="stat-label"
          style={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}
        >
          {label}
        </div>
      </div>
    </div>
  </div>
);

export default StatCard;
