import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiPlus, BiEdit, BiTrash, BiStore, BiX, BiCheck, BiUser, BiPackage, BiStar } from 'react-icons/bi';

const REQUIRED_PLAN_FIELDS = ['name', 'price', 'duration'];

const validatePlanField = (t, name, value) => {
  switch (name) {
    case 'name':
      return String(value || '').trim() ? '' : t('managePlansPage.nameRequired');
    case 'price':
      return value !== '' && value !== null && Number(value) >= 0 ? '' : t('managePlansPage.invalidPrice');
    case 'duration':
      return value ? '' : t('managePlansPage.durationRequired');
    case 'maxUsers':
      return value !== '' && value !== null && Number(value) >= 0 ? '' : t('validation.invalidNumber');
    case 'maxProducts':
      return value !== '' && value !== null && Number(value) >= 0 ? '' : t('validation.invalidNumber');
    default:
      return '';
  }
};

const PlanDrawer = ({ open, onClose, onSuccess, editing, plan }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
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
    setErrors({});
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

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validatePlanField(t, name, value);
      const next = { ...prev };
      if (msg) next[name] = msg; else delete next[name];
      return next;
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    REQUIRED_PLAN_FIELDS.forEach((field) => {
      const msg = validatePlanField(t, field, form[field]);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/plans/${plan._id}`, form, { _skipLoading: true });
      } else {
        await api.post('/plans', form, { _skipLoading: true });
      }
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('managePlansPage.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />{editing ? t('managePlansPage.editPlan') : t('managePlansPage.createPlan')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', background: 'var(--glow-danger)', color: 'var(--danger)', fontWeight: 500, marginBottom: '1.25rem', fontSize: '0.85rem' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} id="plan-form" noValidate>
            <div className="row g-3">
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">{t('managePlansPage.planName')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input {...field('name')} placeholder={t('managePlansPage.planNamePlaceholder')} />
                  {errors.name && <div className="invalid-feedback-premium">{errors.name}</div>}
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">{t('managePlansPage.nameBengali')}</label>
                  <input {...field('nameBn')} placeholder={t('managePlansPage.nameBengaliPlaceholder')} />
                </div>
              </div>
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label">{t('managePlansPage.duration')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <select
                    className={`form-select ${errors.duration ? 'is-invalid' : ''}`}
                    value={form.duration}
                    onChange={(e) => handleChange('duration', e.target.value)}
                  >
                    <option value="monthly">{t('subscription.monthly')}</option>
                    <option value="quarterly">{t('subscription.quarterly')}</option>
                    <option value="yearly">{t('subscription.yearly')}</option>
                  </select>
                  {errors.duration && <div className="invalid-feedback-premium">{errors.duration}</div>}
                </div>
              </div>
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label">💰 {t('common.price')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="number" {...field('price')} placeholder={t('managePlansPage.pricePlaceholder')} />
                  {errors.price && <div className="invalid-feedback-premium">{errors.price}</div>}
                </div>
              </div>
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label"><BiUser style={{ marginRight: '4px' }} />{t('managePlansPage.maxUsers')}</label>
                  <input type="number" {...field('maxUsers')} />
                  {errors.maxUsers && <div className="invalid-feedback-premium">{errors.maxUsers}</div>}
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label"><BiPackage style={{ marginRight: '4px' }} />{t('managePlansPage.maxProducts')}</label>
                  <input type="number" {...field('maxProducts')} />
                  {errors.maxProducts && <div className="invalid-feedback-premium">{errors.maxProducts}</div>}
                </div>
              </div>
              <div className="col-6 d-flex align-items-end">
                <div className="form-check mb-3">
                  <input type="checkbox" className="form-check-input" id="isPopular" checked={form.isPopular} onChange={e => handleChange('isPopular', e.target.checked)} />
                  <label className="form-check-label" htmlFor="isPopular"><BiStar style={{ marginRight: '4px', color: 'var(--warning)' }} />{t('managePlansPage.popularPlan')}</label>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label className="form-label">{t('common.description')}</label>
                  <textarea className="form-control" value={form.description} onChange={e => handleChange('description', e.target.value)} rows={2} placeholder={t('managePlansPage.descriptionPlaceholder')} />
                </div>
              </div>
              <div className="col-12">
                <label className="form-label">{t('managePlansPage.features')}</label>
                <div className="d-flex gap-2 mb-2">
                  <input className="form-control" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); }}} placeholder={t('managePlansPage.addFeaturePlaceholder')} />
                  <button type="button" className="btn-premium btn-premium-primary btn-premium-sm" onClick={addFeature}>{t('common.add')}</button>
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
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="plan-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiCheck /> {editing ? t('managePlansPage.updatePlan') : t('managePlansPage.createPlan')}</>}
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
      const { data } = await api.get('/plans/all', { _skipLoading: true });
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
      await api.delete(`/plans/${id}`, { _skipLoading: true });
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
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('managePlansPage.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('managePlansPage.subtitle')}
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={openCreateDrawer}>
          <BiPlus /> {t('managePlansPage.createPlan')}
        </button>
      </div>

      {/* Plans Grid */}
      <div className="row g-3">
        {loading ? (
          <>
            {[1,2,3].map(i => (
              <div key={i} className="col-md-4">
                <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
                  <div className="premium-card-body">
                    <div className="d-flex justify-content-between mb-3">
                      <div style={{
                        height: 20, width: '60%',
                        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                        backgroundSize: '200% 100%', borderRadius: 6,
                        animation: 'shimmer 1.5s infinite',
                      }} />
                      <div style={{
                        height: 20, width: 60,
                        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                        backgroundSize: '200% 100%', borderRadius: 6,
                        animation: 'shimmer 1.5s infinite',
                      }} />
                    </div>
                    <div style={{
                      height: 36, width: '40%', marginBottom: '1rem',
                      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                      backgroundSize: '200% 100%', borderRadius: 6,
                      animation: 'shimmer 1.5s infinite',
                    }} />
                    <div style={{
                      height: 14, width: '90%', marginBottom: 8,
                      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                      backgroundSize: '200% 100%', borderRadius: 6,
                      animation: 'shimmer 1.5s infinite',
                    }} />
                    <div style={{
                      height: 14, width: '70%', marginBottom: '1rem',
                      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                      backgroundSize: '200% 100%', borderRadius: 6,
                      animation: 'shimmer 1.5s infinite',
                    }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{
                        height: 32, width: 80,
                        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                        backgroundSize: '200% 100%', borderRadius: 6,
                        animation: 'shimmer 1.5s infinite',
                      }} />
                      <div style={{
                        height: 32, width: 80,
                        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                        backgroundSize: '200% 100%', borderRadius: 6,
                        animation: 'shimmer 1.5s infinite',
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
          </>
        ) : plans.length === 0 ? (
          <div className="col-12 text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📋</div>
            {t('managePlansPage.noPlansFound')}
          </div>
        ) : plans.map((plan) => (
          <div key={plan._id} className="col-md-6 col-lg-4">
            <div style={{
              background: '#ffffff', borderRadius: 16, overflow: 'hidden',
              border: plan.isPopular ? '2px solid #6C63FF' : '1px solid #e8e8f0',
              boxShadow: plan.isPopular ? '0 4px 24px rgba(108,99,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.25s ease',
              position: 'relative', height: '100%',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = plan.isPopular ? '0 4px 24px rgba(108,99,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)'; }}
            >
              {/* Popular badge */}
              {plan.isPopular && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'linear-gradient(135deg, #6C63FF, #3a0ca3)',
                  color: 'white', padding: '3px 14px', borderRadius: 100,
                  fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px',
                  boxShadow: '0 2px 8px rgba(108,99,255,0.3)',
                }}>
                  {t('managePlansPage.popular')}
                </div>
              )}

              {/* Card content - compact */}
              <div style={{ padding: '1.25rem 1.5rem 1rem' }}>
                {/* Header: badge + name */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#1a1a2e' }}>{plan.name}</h5>
                  {plan.isPopular && (
                    <span style={{
                      background: 'linear-gradient(135deg, #6C63FF, #3a0ca3)',
                      color: 'white', padding: '2px 10px', borderRadius: 100,
                      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.3px',
                    }}>
                      {t('managePlansPage.popular')}
                    </span>
                  )}
                </div>
                {plan.nameBn && <span style={{ fontSize: '0.72rem', color: '#9a9ab8', display: 'block', marginBottom: '0.5rem' }}>{plan.nameBn}</span>}

                {/* Price row */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6C63FF' }}>₹{plan.price}</span>
                  <span style={{ color: '#9a9ab8', fontSize: '0.78rem', fontWeight: 500 }}>/{plan.duration}</span>
                </div>

                {/* Description (short inline) */}
                {plan.description && (
                  <p style={{ color: '#6b6b8d', fontSize: '0.78rem', marginBottom: '0.65rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {plan.description}
                  </p>
                )}

                {/* Limits row */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.65rem', fontSize: '0.75rem', color: '#6b6b8d' }}>
                  <span><BiUser size={13} color="#6C63FF" style={{ verticalAlign: 'middle', marginRight: 3 }} />{plan.maxUsers} {t('managePlansPage.users')}</span>
                  <span><BiPackage size={13} color="#00D9A6" style={{ verticalAlign: 'middle', marginRight: 3 }} />{plan.maxProducts} {t('managePlansPage.products')}</span>
                </div>

                {/* Features - compact */}
                {plan.features?.length > 0 && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    {plan.features.slice(0, 3).map((f, i) => (
                      <div key={i} style={{ padding: '0.12rem 0', fontSize: '0.76rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#00D9A6', fontWeight: 700 }}>✓</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                      </div>
                    ))}
                    {plan.features.length > 3 && (
                      <div style={{ fontSize: '0.7rem', color: '#9a9ab8', paddingLeft: 16 }}>{t('managePlansPage.moreFeatures', { count: plan.features.length - 3 })}</div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEditDrawer(plan)} style={{
                    flex: 1, padding: '0.4rem', borderRadius: 8, border: '1px solid #e8e8f0',
                    background: '#ffffff', color: '#555', fontWeight: 600, fontSize: '0.75rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6C63FF'; e.currentTarget.style.color = '#6C63FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8f0'; e.currentTarget.style.color = '#555'; }}
                  >
                    <BiEdit size={13} /> {t('common.edit')}
                  </button>
                  <button onClick={() => setDeleteConfirm(plan._id)} style={{
                    flex: 1, padding: '0.4rem', borderRadius: 8, border: '1px solid #FF6B6B',
                    background: '#ffffff', color: '#FF6B6B', fontWeight: 600, fontSize: '0.75rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FF6B6B15'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <BiTrash size={13} /> {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Plan Drawer */}
      <PlanDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(false); setEditingPlan(null); }}
        onSuccess={fetchPlans}
        editing={editing}
        plan={editingPlan}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>{t('managePlansPage.deletePlan')}</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{t('managePlansPage.deletePlanConfirm')}</p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePlans;