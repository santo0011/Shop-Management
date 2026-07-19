import React from 'react';

/**
 * Inline loading spinner used by individual pages/components.
 * Uses the same modern CSS circular spinner as LoadingOverlay.
 */
const Loading = ({ text = 'Loading...' }) => {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'loading-spin 0.7s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
          {text}
        </p>
      </div>
    </div>
  );
};

export default Loading;