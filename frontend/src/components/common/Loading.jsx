import React from 'react';

const Loading = ({ text = 'Loading...' }) => {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="spinner-border mb-3" style={{ color: 'var(--primary-color)', width: '3rem', height: '3rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{text}</p>
      </div>
    </div>
  );
};

export default Loading;