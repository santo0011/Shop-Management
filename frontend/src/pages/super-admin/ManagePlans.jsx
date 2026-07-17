import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiPlus, BiEdit, BiTrash, BiStore, BiX, BiCheck, BiDollar, BiUser, BiPackage, BiStar } from 'react-icons/bi';

const PlanDrawer = ({ open, onClose, onSuccess, editing, plan }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '', nameBn: '', duration: 'monthly', price: '',
    description: '', features: [], isPopular: false,
    maxUsers: 1, maxProducts: 100,
  });
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    if (editing && plan) {
      setForm({
        name: plan.name || '',
        nameBn: plan.nameBn || '',
        duration: plan.duration || 'monthly',
        price: plan.price || '',
        description: plan.description || '',
        features: plan.features || [],
        isPopular: plan.isPopular || false,
        maxUsers: plan.maxUsers || 1,
        maxProducts: plan.maxProducts || 100,
      });
    } else {
      setForm({ name: '', nameBn: '', duration: 'monthly', price: '', description: '', features: [], isPopular: false, maxUsers: 1, maxProducts: 100 });
    }
    setError(null);
    setFeatureInput('');
  }, [editing, plan, open]);

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/plans/${plan._id}`, form);
      } else {
        await api.post('/plans', form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />{editing ? 'Edit' : 'Create'} Plan</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', background: 'var(--glow-danger)', color: 'var(--danger)', fontWeight: 500, marginBottom: '1.25rem', fontSize: '0.85rem' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} id="plan-form">
            <div className="row g-3">
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Plan Name</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Starter" required />
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Name (Bengali)</label>
                  <input className="form-control" value={form.nameBn} onChange={e => setForm({...form, nameBn: e.target.value})} placeholder="বাংলা নাম" />
                </div>
              </div>
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select className="form-select" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label"><BiDollar style={{ marginRight: '4px' }} />Price</label>
                  <input type="number" className="form-control" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0" required />
                </div>
              </div>
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label"><BiUser style={{ marginRight: '4px' }} />Max Users</label>
                  <input type="number" className="form-control" value={form.maxUsers} onChange={e => setForm({...form, maxUsers: e.target.value})} />
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label"><BiPackage style={{ marginRight: '4px' }} />Max Products</label>
                  <input type="number" className="form-control" value={form.maxProducts} onChange={e => setForm({...form, maxProducts: e.target.value})} />
                </div>
              </div>
              <div className="col-6 d-flex align-items-end">
                <div className="form-check mb-3">
                  <input type="checkbox" className="form-check-input" id="isPopular" checked={form.isPopular} onChange={e => setForm({...form, isPopular: e.target.checked})} />
                  <label className="form-check-label" htmlFor="isPopular"><BiStar style={{ marginRight: '4px', color: 'var(--warning)' }} />Popular Plan</label>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Plan description" />
                </div>
              </div>
              <div className="col-12">
                <label className="form-label">Features</label>
                <div className="d-flex gap-2 mb-2">
                  <input className="form-control" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); }}} placeholder="Add a feature and press Enter" />
                  <button type="button" className="btn-premium btn-premium-primary btn-premium-sm" onClick={addFeature}>Add</button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {form.features.map((feature, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '50px', background: 'var(--glow-primary)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 500 }}>
                      {feature}
                      <button type="button" className="btn-close-premium" style={{ width: '18px', height: '18px', fontSize: '0.7rem' }} onClick={() => removeFeature(idx)}><BiX /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="plan-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {editing ? 'Update Plan' : 'Create Plan'}</>}
          </button>
        </div>
      </div>
    </>
  );
};

const ManagePlans = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/plans/all');
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDrawer = () => {
    setEditing(false);
    setEditingPlan(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (plan) => {
    setEditing(true);
    setEditingPlan(plan);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/plans/${id}`);
      setDeleteConfirm(null);
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.plans')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage subscription plans and pricing
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={openCreateDrawer}>
          <BiPlus /> {t('common.create')}
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border spinner-border-sm" /> Loading...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📋</div>
          No plans found
        </div>
      ) : (
        <div className="row g-3">
          {plans.map(plan => (
            <div key={plan._id} className="col-md-6 col-lg-4">
              <div className="premium-card" style={{ position: 'relative', overflow: 'visible' }}>
                {plan.isPopular && (
                  <span style={{ position: 'absolute', top: '-10px', right: '16px', padding: '4px 12px', borderRadius: '50px', background: 'var(--gradient-primary)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Popular
                  </span>
                )}
                <div className="premium-card-body text-center">
                  <h5 style={{ fontWeight: 700 }}>{plan.name}</h5>
                  {plan.nameBn && <small style={{ color: 'var(--text-muted)' }}>{plan.nameBn}</small>}
                  <h2 style={{ color: 'var(--primary)', fontWeight: 800, margin: '1rem 0 0.25rem' }}>৳{plan.price}</h2>
                  <small style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>per {plan.duration}</small>

                  <div className="mt-3 mb-3" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    {(plan.features || []).map((f, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <BiCheck style={{ color: 'var(--secondary)', fontSize: '1rem', flexShrink: 0 }} />
                        {f}
                      </div>
                    ))}
                  </div>

                  <div className="d-flex gap-2 justify-content-center">
                    <button className="btn-premium btn-premium-sm btn-premium-secondary" onClick={() => openEditDrawer(plan)}>
                      <BiEdit /> Edit
                    </button>
                    <button className="btn-premium btn-premium-sm btn-premium-danger" onClick={() => setDeleteConfirm(plan._id)}>
                      <BiTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-premium-header"><h5>Delete Plan</h5><button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button></div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this plan? This action cannot be undone.</p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Drawer */}
      <PlanDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchPlans}
        editing={editing}
        plan={editingPlan}
      />
    </div>
  );
};

export default ManagePlans;
