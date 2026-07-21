import React from 'react';
import i18n from '../../utils/i18n';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'Arial, sans-serif',
          background: '#f8f9fc',
          color: '#2d3436',
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>{i18n.t('common.somethingWentWrong')}</h2>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{i18n.t('common.error')}:</p>
            <pre style={{
              background: '#f1f2f6',
              padding: '1rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo && (
              <>
                <p style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>{i18n.t('common.stackTrace')}:</p>
                <pre style={{
                  background: '#f1f2f6',
                  padding: '1rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '300px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 2rem',
              background: '#6C63FF',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {i18n.t('common.reloadPage')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;