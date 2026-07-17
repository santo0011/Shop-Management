import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './utils/i18n';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <Suspense fallback={
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}>
            <div className="text-center" style={{
              padding: '2rem',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#6C63FF', marginBottom: '1rem' }}></i>
              <p style={{ color: '#5a5a7a', margin: 0, fontSize: '1rem', fontWeight: 500 }}>Loading application...</p>
            </div>
          </div>
        }>
          <App />
        </Suspense>
      </ErrorBoundary>
    </Provider>
  </React.StrictMode>
);