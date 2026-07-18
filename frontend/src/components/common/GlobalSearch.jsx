import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { BiSearch, BiX, BiPackage, BiUser, BiBarcode, BiPhone } from 'react-icons/bi';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

const GlobalSearch = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // { products, customers }
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);

  const flatResults = useMemo(() => {
    if (!results) return [];
    return [
      ...results.products.map((item) => ({ type: 'product', item })),
      ...results.customers.map((item) => ({ type: 'customer', item })),
    ];
  }, [results]);

  useEffect(() => {
    const term = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const reqId = ++requestIdRef.current;
      api
        .get(`/search?q=${encodeURIComponent(term)}`, { _skipLoading: true })
        .then(({ data }) => {
          if (reqId !== requestIdRef.current) return;
          setResults({ products: data.products || [], customers: data.customers || [] });
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (reqId !== requestIdRef.current) return;
          setResults({ products: [], customers: [] });
          setOpen(true);
        })
        .finally(() => {
          if (reqId === requestIdRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const goTo = (type, item) => {
    setOpen(false);
    setMobileOpen(false);
    setQuery('');
    setResults(null);
    if (type === 'product') {
      navigate('/products', { state: { openProductId: item._id } });
    } else {
      navigate('/customers', { state: { openCustomerId: item._id } });
    }
  };

  const handleKeyDown = (e) => {
    if (!open || flatResults.length === 0) {
      if (e.key === 'Escape') {
        clearSearch();
        setMobileOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flatResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatResults.length) {
        const { type, item } = flatResults[activeIndex];
        goTo(type, item);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setMobileOpen(false);
      inputRef.current?.blur();
    }
  };

  const term = query.trim();
  const hasResults = results && (results.products.length > 0 || results.customers.length > 0);
  const showEmpty = open && results && !hasResults && !loading;

  let flatCursor = -1;

  return (
    <div className={`global-search ${mobileOpen ? 'global-search--mobile-open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="global-search-mobile-toggle"
        aria-label="Search"
        onClick={() => {
          setMobileOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <BiSearch />
      </button>

      <div className="global-search-box">
        <BiSearch className="global-search-icon" />
        <input
          ref={inputRef}
          className="global-search-input"
          type="text"
          placeholder="Search products, customers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true); }}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
          autoComplete="off"
        />
        {query && (
          <button type="button" className="global-search-clear" onClick={clearSearch} aria-label="Clear search">
            <BiX />
          </button>
        )}
        <button
          type="button"
          className="global-search-mobile-close"
          aria-label="Close search"
          onClick={() => { setMobileOpen(false); clearSearch(); }}
        >
          <BiX />
        </button>
      </div>

      {open && term.length >= MIN_QUERY_LENGTH && (
        <div className="global-search-dropdown" role="listbox">
          {showEmpty && (
            <div className="global-search-empty">
              No results found for "<strong>{term}</strong>"
            </div>
          )}

          {results?.products.length > 0 && (
            <div className="global-search-group">
              <div className="global-search-group-title">Products</div>
              {results.products.map((p) => {
                flatCursor += 1;
                const idx = flatCursor;
                return (
                  <button
                    type="button"
                    key={p._id}
                    className={`global-search-item ${activeIndex === idx ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goTo('product', p)}
                    role="option"
                    aria-selected={activeIndex === idx}
                  >
                    <span className="global-search-item-icon global-search-item-icon-product"><BiPackage /></span>
                    <span className="global-search-item-body">
                      <span className="global-search-item-title">{p.name}</span>
                      <span className="global-search-item-sub">
                        {p.barcode && <><BiBarcode size={12} /> {p.barcode}</>}
                        {p.barcode && p.category?.name ? ' · ' : ''}
                        {p.category?.name}
                      </span>
                    </span>
                    <span className="global-search-item-meta">
                      <span className="global-search-item-price">₹{p.sellingPrice}</span>
                      <span className={`global-search-item-stock ${p.stock <= 0 ? 'out' : ''}`}>{p.stock} {p.unit}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {results?.customers.length > 0 && (
            <div className="global-search-group">
              <div className="global-search-group-title">Customers</div>
              {results.customers.map((c) => {
                flatCursor += 1;
                const idx = flatCursor;
                return (
                  <button
                    type="button"
                    key={c._id}
                    className={`global-search-item ${activeIndex === idx ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goTo('customer', c)}
                    role="option"
                    aria-selected={activeIndex === idx}
                  >
                    <span className="global-search-item-icon global-search-item-icon-customer"><BiUser /></span>
                    <span className="global-search-item-body">
                      <span className="global-search-item-title">{c.name}</span>
                      <span className="global-search-item-sub"><BiPhone size={12} /> {c.phone}</span>
                    </span>
                    <span className="global-search-item-meta">
                      {c.dueAmount > 0 && <span className="global-search-item-due">Due ₹{c.dueAmount}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
