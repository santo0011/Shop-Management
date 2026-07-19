import React, { useState, useEffect, useRef } from 'react';

// ─── Compact number formatting for mobile ──────────────────
const formatCompact = (num, isCurrency) => {
  const prefix = isCurrency ? '₹' : '';
  if (num >= 10000000) return `${prefix}${(num / 10000000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  if (num >= 100000) return `${prefix}${(num / 100000).toFixed(2).replace(/\.?0+$/, '')}L`;
  if (num >= 1000) return `${prefix}${(num / 1000).toFixed(1).replace(/\.?0$/, '')}K`;
  return `${prefix}${num}`;
};

// ─── Easing function ───────────────────────────────────────
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// ─── Animated Number ───────────────────────────────────────
const AnimatedNumber = ({ value, duration = 400, isCurrency = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const prevValueRef = useRef(value);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Only animate if value actually changed
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    hasAnimatedRef.current = false;

    const startValue = 0;
    const diff = value - startValue;
    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = startValue + diff * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        hasAnimatedRef.current = true;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const prefix = isCurrency ? '₹' : '';
  const formatted = prefix + Number(displayValue).toLocaleString('en-IN', {
    minimumFractionDigits: displayValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return <>{formatted}</>;
};

// ─── StatCard ──────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'primary', rawValue, isCurrency = false }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse numeric value for animation
  const numericValue = rawValue !== undefined
    ? (typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue).replace(/[^0-9.-]/g, '')) || 0)
    : (typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0);

  // On mobile, use compact format; on desktop use the formatted `value` string
  const displayValue = isMobile ? formatCompact(numericValue, isCurrency) : value;

  return (
    <div
      className={`stat-card stat-card-modern stat-${color}`}
      style={{ padding: '1.15rem 1.25rem', cursor: 'default' }}
      title={isMobile && isCurrency ? `₹${Number(numericValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined}
    >
      <div className="d-flex align-items-center gap-3">
        <div
          className="stat-icon-wrapper"
          style={{ width: '40px', height: '40px', fontSize: '1.2rem', marginBottom: 0, flexShrink: 0 }}
        >
          <Icon />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="stat-value"
            style={{
              fontSize: isMobile ? '1.1rem' : '1.3rem',
              fontWeight: 800,
              marginBottom: '2px',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <AnimatedNumber value={numericValue} duration={400} isCurrency={isCurrency} />
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
};

export default StatCard;