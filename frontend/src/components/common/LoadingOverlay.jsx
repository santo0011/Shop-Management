import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

// Requests shorter than this never flash the overlay at all.
const SHOW_DELAY = 200;
// Fade-out is purely cosmetic — the overlay is hidden immediately, this only
// keeps it mounted long enough to play the opacity transition.
const FADE_DURATION = 150;

const LoadingOverlay = () => {
  const { globalLoading, text } = useSelector((state) => state.loading);
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (globalLoading) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      showTimerRef.current = setTimeout(() => {
        setShouldRender(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setVisible(true));
        });
      }, SHOW_DELAY);
    } else {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      setVisible(false);
      hideTimerRef.current = setTimeout(() => setShouldRender(false), FADE_DURATION);
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [globalLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`loading-overlay ${visible ? 'loading-overlay--visible' : ''}`}
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
        transition: 'opacity 0.15s ease-in-out',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="loading-overlay__content text-center"
        style={{
          padding: '2rem',
          borderRadius: '12px',
          backgroundColor: 'var(--overlay-content-bg)',
          boxShadow: 'var(--overlay-shadow)',
        }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{
            fontSize: '3rem',
            color: 'var(--primary-color)',
            marginBottom: '1rem',
          }}
        ></i>
        <p
          style={{
            color: 'var(--text-secondary)',
            margin: 0,
            fontSize: '1rem',
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
