import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BiSearch, BiPlus, BiPackage } from 'react-icons/bi';
import api from '../../services/api';

// ─── Helper: highlight matching text ─────────────────────────────────────────
const HighlightMatch = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="psf-highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// ─── Product Search Autocomplete (Portal-based dropdown) ─────────────────────
const ProductSearchField = forwardRef(({
  value,
  onSelect,
  onCreateNew,
  onEnter,
  placeholder = 'Search by name, barcode or SKU...',
  disabled = false,
}, ref) => {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);
  const listRef = useRef(null);

  // Combine forwarded ref with internal input ref
  const setInputRef = useCallback((el) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  useEffect(() => {
    setQuery(value?.name || '');
  }, [value]);

  // ─── Fetch results ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/search?q=${encodeURIComponent(query.trim())}`, { _skipLoading: true });
        setResults(Array.isArray(data) ? data : data.products || []);
        setHighlight(0);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  // ─── Calculate dropdown position ────────────────────────────────────────
  const updateDropdownPosition = useCallback(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.bottom + 2}px`,
      width: `${rect.width}px`,
      zIndex: 99999,
    });
  }, [open]);

  useEffect(() => {
    updateDropdownPosition();
    if (!open) return;
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [open, updateDropdownPosition]);

  const totalOptions = results.length + (query.trim() ? 1 : 0);
  const createNewIndex = results.length;

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || !open) return;
    const active = listRef.current.querySelector('.psf-option.active');
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlight, open]);

  const selectProduct = (product) => {
    setQuery(product.name);
    setOpen(false);
    onSelect?.(product);
  };

  const handleCreateNew = () => {
    setOpen(false);
    onCreateNew?.(query.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => Math.min(h + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && totalOptions > 0) {
        if (highlight === createNewIndex) handleCreateNew();
        else if (results[highlight]) selectProduct(results[highlight]);
      } else {
        onEnter?.();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const showDropdown = open && query.trim();

  return (
    <div className="psf-wrapper" ref={wrapRef}>
      <div className="psf-input-group">
        <BiSearch className="psf-search-icon" />
        <input
          ref={setInputRef}
          type="text"
          className="psf-input"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Portal-based dropdown — renders at document.body to avoid clipping */}
      {showDropdown && createPortal(
        <div className="psf-dropdown psf-dropdown-portal" style={dropdownStyle} ref={listRef}>
          {results.length > 0 && results.map((p, idx) => (
            <div
              key={p._id}
              className={`psf-option ${idx === highlight ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectProduct(p); }}
              onMouseEnter={() => setHighlight(idx)}
            >
              <div className="psf-option-icon">
                <BiPackage />
              </div>
              <div className="psf-option-content">
                <span className="psf-option-name">
                  <HighlightMatch text={p.name} query={query} />
                </span>
                <span className="psf-option-details">
                  {p.barcode && (
                    <span className="psf-option-detail-item">
                      <strong>Barcode:</strong> <HighlightMatch text={p.barcode} query={query} />
                    </span>
                  )}
                  {p.sku && !p.barcode && (
                    <span className="psf-option-detail-item">
                      <strong>SKU:</strong> <HighlightMatch text={p.sku} query={query} />
                    </span>
                  )}
                </span>
                <div className="psf-option-meta">
                  <span className="psf-option-stock">
                    Stock: <strong>{p.stock}</strong> {p.unit || 'pc'}
                  </span>
                  <span className="psf-option-price">
                    ₹{Number(p.purchasePrice || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {!loading && results.length === 0 && (
            <div className="psf-empty">
              <BiPackage size={20} />
              <span>No products found for "<strong>{query.trim()}</strong>"</span>
            </div>
          )}

          <div
            className={`psf-option psf-option-create ${highlight === createNewIndex ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); handleCreateNew(); }}
            onMouseEnter={() => setHighlight(createNewIndex)}
          >
            <div className="psf-option-icon psf-create-icon">
              <BiPlus />
            </div>
            <div className="psf-option-content">
              <span className="psf-option-name" style={{ color: 'var(--primary)' }}>
                + Create New Product
              </span>
              <span className="psf-option-details" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                "{query.trim()}"
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

ProductSearchField.displayName = 'ProductSearchField';

export default ProductSearchField;