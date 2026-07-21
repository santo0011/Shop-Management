import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiPlus, BiEdit, BiTrash, BiStore, BiX, BiCheck, BiDollar, BiUser, BiPackage, BiStar } from 'react-icons/bi';

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
                  <label className="form-label"><BiDollar style={{ marginRight: '4px' }} />{t('common.price')} <span style={{color: 'var(--danger)'}}>*</span></label>
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
          <div className="col-12 text-center py-5">
            <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
          </div>
        ) : plans.length === 0 ? (
          <div className="col-12 text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📋</div>
            {t('managePlansPage.noPlansFound')}
          </div>
        ) : plans.map((plan) => (
          <div key={plan._id} className="col-md-4">
            <div className={`premium-card ${plan.isPopular ? 'border-primary' : ''}`}>
              <div className="premium-card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="mb-0" style={{ fontWeight: 700 }}>{plan.name}</h5>
                    {plan.nameBn && <small style={{ color: 'var(--text-muted)' }}>{plan.nameBn}</small>}
                  </div>
                  {plan.isPopular && <span className="badge badge-primary">{t('managePlansPage.popular')}</span>}
                </div>
                <div className="mb-3">
                  <span style={{ fontSize: '2rem', fontWeight: 800 }}>₹{plan.price}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/{plan.duration}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{plan.description}</p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div><BiUser style={{ marginRight: '4px' }} />{plan.maxUsers} {t('managePlansPage.users')}</div>
                  <div><BiPackage style={{ marginRight: '4px' }} />{plan.maxProducts} {t('managePlansPage.products')}</div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={() => openEditDrawer(plan)}>
                    <BiEdit /> {t('common.edit')}
                  </button>
                  <button className="btn-premium btn-premium-danger btn-premium-sm" onClick={() => setDeleteConfirm(plan._id)}>
                    <BiTrash /> {t('common.delete')}
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