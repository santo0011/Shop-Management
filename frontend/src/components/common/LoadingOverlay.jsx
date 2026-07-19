import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

/**
 * Global loading overlay with a modern circular spinner.
 *
 * Behaviour:
 *  - Shows the overlay only when globalLoading is true for longer than
 *    SHOW_DELAY ms (avoids flashing for very fast operations).
 *  - Hides the overlay **immediately** when globalLoading becomes false.
 *    No fade-out, no artificial delay — the moment data is ready, the
 *    overlay disappears so the user can interact with the page.
 */

const SHOW_DELAY = 100; // ms — only show if loading takes longer than this

const LoadingOverlay = () => {
  const { globalLoading, text } = useSelector((state) => state.loading);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (globalLoading) {
      // Start the show-delay timer
      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, SHOW_DELAY);
    } else {
      // Clear any pending show timer and hide immediately
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [globalLoading]);

  if (!visible) return null;

  return (
    <div
      className="loading-overlay"
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
        backgroundColor: 'var(--overlay-bg)',
      }}
    >
      <div
        className="loading-overlay__content"
        style={{
          padding: '1.75rem 2.5rem',
          borderRadius: '16px',
          backgroundColor: 'var(--overlay-content-bg)',
          boxShadow: 'var(--overlay-shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Modern CSS circular spinner */}
        <div
          className="loading-spinner"
          style={{
            width: 40,
            height: 40,
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'loading-spin 0.7s linear infinite',
          }}
        />
        <p
          style={{
            color: 'var(--text-secondary)',
            margin: 0,
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;