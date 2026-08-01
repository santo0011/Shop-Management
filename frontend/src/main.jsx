import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import i18n from './utils/i18n';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';

// Global fix: scrolling the mouse wheel / touchpad while a type="number"
// input is focused (Paid Amount, Discount, Stock, VAT, Quantity, etc.)
// would otherwise silently increment/decrement its value. Delegating one
// listener here — rather than fixing every input on every page — covers
// every numeric field in the app, including ones added later. Blurring
// the input (instead of calling preventDefault) stops the value change
// without blocking normal page/container scrolling; typing and arrow-key
// stepping are untouched since neither goes through the wheel event.
document.addEventListener(
  'wheel',
  (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
      e.target.blur();
    }
  },
  { passive: true }
);

const AppLoader = () => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      setTheme(savedTheme);
    }
  }, []);

  const isDark = theme === 'dark';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          padding: '1.75rem 2.5rem',
          borderRadius: '16px',
          backgroundColor: isDark ? '#1a1a3e' : '#ffffff',
          boxShadow: isDark
            ? '0 4px 20px rgba(0, 0, 0, 0.4)'
            : '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid ' + (isDark ? '#2a2a4e' : '#e8e8f0'),
            borderTopColor: '#6C63FF',
            borderRadius: '50%',
            animation: 'loading-spin 0.7s linear infinite',
          }}
        />
        <p
          style={{
            color: isDark ? '#9a9ab8' : '#5a5a7a',
            margin: 0,
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {i18n.t('common.loadingApplication')}
        </p>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <Suspense fallback={<AppLoader />}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </Provider>
  </React.StrictMode>
);
