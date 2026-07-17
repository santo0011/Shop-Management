import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { BiSearch, BiPlus, BiStore, BiX, BiUser, BiPhone, BiEnvelope, BiMap, BiLock, BiCheck, BiShow, BiEdit, BiTrash } from 'react-icons/bi';

const AddShopDrawer = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/shops', {
        name: form.shopName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        address: form.address,
      });
      setForm({ shopName: '', ownerName: '', email: '', phone: '', password: '', address: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />Add New Shop</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} id="add-shop-form">
            <div className="form-group">
              <label className="form-label"><BiStore style={{ marginRight: '6px' }} />Shop Name</label>
              <input className="form-control" name="shopName" value={form.shopName} onChange={handleChange} placeholder="Enter shop name" required />
            </div>
            <div className="form-group">
              <label className="form-label"><BiUser style={{ marginRight: '6px' }} />Owner Name</label>
              <input className="form-control" name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Enter owner name" required />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiPhone style={{ marginRight: '6px' }} />Phone</label>
                  <input className="form-control" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" required />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiEnvelope style={{ marginRight: '6px' }} />Email</label>
                  <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} placeholder="Email address" required />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><BiLock style={{ marginRight: '6px' }} />Password</label>
              <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} placeholder="Set initial password" required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label"><BiMap style={{ marginRight: '6px' }} />Address</label>
              <textarea className="form-control" name="address" value={form.address} onChange={handleChange} placeholder="Enter shop address" rows={3} />
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="add-shop-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> Creating...</> : <><BiCheck /> Create Shop</>}
          </button>
        </div>
      </div>
    </>
  );
};

const ManageShops = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-open drawer when navigated from "Add Shop" sidebar link
  useEffect(() => {
    if (location.state?.openAddShopDrawer) {
      setDrawerOpen(true);
      // Clear the state so it doesn't re-open on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/shops?search=${search}`);
      setShops(data.shops || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const [viewShop, setViewShop] = useState(null);
  const [editShop, setEditShop] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const toggleStatus = async (id) => {
    try {
      await api.put(`/shops/${id}/toggle-status`);
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/shops/${id}`);
      setDeleteConfirm(null);
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.shops')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage all registered shops
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => setDrawerOpen(true)}>
          <BiPlus /> Add Shop
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={`${t('common.search')} shops...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Shops Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Owner</th>
                <th>Phone</th>
                <th>{t('nav.subscription')}</th>
                <th>{t('common.status')}</th>
                <th style={{ width: '120px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🏪</div>
                    No shops found
                  </td>
                </tr>
              ) : shops.map(shop => (
                <tr key={shop._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{shop.name}</div>
                  </td>
                  <td>{shop.owner?.name || 'N/A'}</td>
                  <td>{shop.phone}</td>
                  <td>
                    <span className={`badge ${
                      shop.subscriptionStatus === 'active' ? 'badge-success' :
                      shop.subscriptionStatus === 'trial' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {shop.subscriptionStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${shop.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {shop.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip="View" onClick={() => setViewShop(shop)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => setEditShop(shop)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => setDeleteConfirm(shop._id)}>
                        <BiTrash />
                      </button>
                      <button
                        className={`btn-action btn-action-toggle ${shop.isActive ? 'active' : ''}`}
                        data-tooltip={shop.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleStatus(shop._id)}
                      >
                        {shop.isActive ? <BiX /> : <BiCheck />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shop Drawer */}
      <AddShopDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchShops}
      />

      {/* View Shop Modal */}
      {viewShop && (
        <div className="modal-premium" onClick={() => setViewShop(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />{viewShop.name}</h5>
              <button className="btn-close-premium" onClick={() => setViewShop(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body">
              <div className="row g-3">
                <div className="col-6">
                  <small style={{ color: 'var(--text-muted)' }}>Owner</small>
                  <div style={{ fontWeight: 600 }}>{viewShop.owner?.name || 'N/A'}</div>
                </div>
                <div className="col-6">
                  <small style={{ color: 'var(--text-muted)' }}>Email</small>
                  <div style={{ fontWeight: 600 }}>{viewShop.email || 'N/A'}</div>
                </div>
                <div className="col-6">
                  <small style={{ color: 'var(--text-muted)' }}>Phone</small>
                  <div style={{ fontWeight: 600 }}>{viewShop.phone}</div>
                </div>
                <div className="col-6">
                  <small style={{ color: 'var(--text-muted)' }}>Status</small>
                  <div><span className={`badge ${viewShop.isActive ? 'badge-success' : 'badge-danger'}`}>{viewShop.isActive ? 'Active' : 'Inactive'}</span></div>
                </div>
                <div className="col-6">
                  <small style={{ color: 'var(--text-muted)' }}>Subscription</small>
                  <div><span className={`badge ${viewShop.subscriptionStatus === 'active' ? 'badge-success' : viewShop.subscriptionStatus === 'trial' ? 'badge-warning' : 'badge-danger'}`}>{viewShop.subscriptionStatus}</span></div>
                </div>
                <div className="col-6">
                  <small style={{ color: 'var(--text-muted)' }}>Created</small>
                  <div style={{ fontWeight: 600 }}>{new Date(viewShop.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div className="modal-premium-footer">
              <button className="btn-premium btn-premium-secondary" onClick={() => setViewShop(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shop Modal */}
      {editShop && (
        <div className="modal-premium" onClick={() => setEditShop(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5><BiEdit style={{ marginRight: '8px', color: 'var(--primary)' }} />Edit Shop</h5>
              <button className="btn-close-premium" onClick={() => setEditShop(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body">
              <div className="form-group">
                <label className="form-label">Shop Name</label>
                <input className="form-control" value={editShop.name} onChange={e => setEditShop({...editShop, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={editShop.phone} onChange={e => setEditShop({...editShop, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" value={editShop.email} onChange={e => setEditShop({...editShop, email: e.target.value})} />
              </div>
            </div>
            <div className="modal-premium-footer">
              <button className="btn-premium btn-premium-secondary" onClick={() => setEditShop(null)}>Cancel</button>
              <button className="btn-premium btn-premium-primary" onClick={async () => {
                try {
                  await api.put(`/shops/${editShop._id}`, { name: editShop.name, phone: editShop.phone, email: editShop.email });
                  setEditShop(null);
                  fetchShops();
                } catch (err) {
                  console.error(err);
                }
              }}><BiCheck /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-premium-header"><h5>Delete Shop</h5><button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button></div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this shop? This action cannot be undone.</p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageShops;
