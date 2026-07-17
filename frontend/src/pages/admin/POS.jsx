import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiSearch, BiPlus, BiMinus, BiTrash, BiPrinter, BiUser, BiCart } from 'react-icons/bi';

const POS = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => searchProducts(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/customers?limit=50').then(({data}) => setCustomers(data.customers)).catch(() => {});
  }, []);

  const searchProducts = async () => {
    try {
      const { data } = await api.get(`/products/search?q=${search}`);
      setProducts(data);
    } catch (err) { console.error(err); }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        return prev.map(item => item.product._id === product._id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item);
      }
      return [...prev, { product, quantity: 1, price: product.sellingPrice, discount: product.discount || 0, total: product.sellingPrice }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product._id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.product._id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + ((item.price * item.discount / 100) * item.quantity), 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax - totalDiscount;
  const change = Math.max(0, paidAmount - grandTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const { data } = await api.post('/sales', {
        customer: customer || null,
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          unit: item.product.unit,
          price: item.price,
          discount: item.discount,
          tax: item.product.tax || 0,
          total: item.total,
        })),
        subtotal,
        discount: totalDiscount,
        tax,
        paidAmount: Math.max(paidAmount, grandTotal),
        paymentMethod,
        posType: 'pos',
      });
      alert(`Invoice: ${data.invoiceNo}`);
      setCart([]);
      setPaidAmount(0);
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    }
  };

  return (
    <div className="pos-container">
      <div className="pos-left">
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            ref={searchRef}
            className="form-control form-control-lg"
            placeholder={`${t('common.search')} ${t('nav.products')}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <div className="row g-2 flex-grow-1 overflow-auto">
          {products.slice(0, 20).map(product => (
            <div key={product._id} className="col-6 col-md-4 col-lg-3">
              <div className="glass-card p-3 text-center cursor-pointer" onClick={() => addToCart(product)} style={{ cursor: 'pointer' }}>
                <div className="mb-2" style={{ fontSize: '2rem' }}>📦</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{product.name}</div>
                <div style={{ color: 'var(--primary-color)', fontWeight: 700 }}>৳{product.sellingPrice}</div>
                <small style={{ color: 'var(--text-muted)' }}>{t('product.stock')}: {product.stock}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pos-right">
        <div className="p-3 border-bottom">
          <select className="form-select form-select-sm" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">Walk-in Customer</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
          </select>
        </div>

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
              <BiCart size={48} /><br />{t('sale.cart')} {t('common.noData')}
            </div>
          ) : cart.map((item) => (
            <div key={item.product._id} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex-grow-1">
                <small style={{ fontWeight: 600 }}>{item.product.name}</small>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <button className="btn btn-sm btn-outline-secondary p-0 px-1" onClick={() => updateQty(item.product._id, -1)}><BiMinus /></button>
                  <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                  <button className="btn btn-sm btn-outline-secondary p-0 px-1" onClick={() => updateQty(item.product._id, 1)}><BiPlus /></button>
                  <span className="ms-auto" style={{ fontWeight: 600 }}>৳{item.total}</span>
                </div>
              </div>
              <button className="btn btn-sm btn-link text-danger" onClick={() => removeItem(item.product._id)}><BiTrash /></button>
            </div>
          ))}
        </div>

        <div className="pos-total">
          <div className="d-flex justify-content-between mb-1"><small>{t('sale.subtotal')}</small><span>৳{subtotal.toFixed(2)}</span></div>
          <div className="d-flex justify-content-between mb-1"><small>{t('sale.discount')}</small><span className="text-danger">-৳{totalDiscount.toFixed(2)}</span></div>
          <div className="d-flex justify-content-between mb-1"><small>{t('sale.tax')}</small><span>৳{tax.toFixed(2)}</span></div>
          <hr />
          <div className="d-flex justify-content-between mb-2"><h5>{t('sale.total')}</h5><h5>৳{grandTotal.toFixed(2)}</h5></div>

          <select className="form-select form-select-sm mb-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">{t('sale.cash')}</option>
            <option value="card">{t('sale.card')}</option>
            <option value="upi">{t('sale.upi')}</option>
            <option value="mobile_banking">{t('sale.mobileBanking')}</option>
            <option value="due">{t('sale.dueSale')}</option>
          </select>

          <div className="input-group mb-2">
            <span className="input-group-text">৳</span>
            <input type="number" className="form-control" placeholder={t('sale.total')} value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />
          </div>

          {change > 0 && <div className="text-success fw-bold mb-2">{t('commonChange', 'Change')}: ৳{change.toFixed(2)}</div>}

          <button className="btn btn-primary-custom w-100 py-2" onClick={handleCheckout} disabled={cart.length === 0}>
            {t('sale.checkout')} (৳{grandTotal.toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;