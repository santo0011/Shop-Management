import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import showToast from '../../utils/toast';

const Subscription = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchStatus();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/plans', { _skipLoading: true });
      setPlans(data);
    } catch (err) { console.error(err); }
  };

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/subscription/status', { _skipLoading: true });
      setStatus(data);
    } catch (err) { console.error(err); }
  };

  const handleSubscribe = async (planId) => {
    try {
      await api.post('/subscription/subscribe', { planId, paymentMethod: 'cash' });
      showToast.success(t('subscriptionPage.subscribedSuccess'));
      fetchStatus();
    } catch (err) {
      showToast.error(err.response?.data?.message || t('subscriptionPage.subscribeFailed'));
    }
  };

  return (
    <div>
      <h4 className="mb-4">{t('nav.subscription')}</h4>

      {status && (
        <div className="glass-card p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6>{t('subscription.currentPlan')}</h6>
              <h5 className={status.isExpired ? 'text-danger' : 'text-success'}>
                {status.subscriptionStatus === 'trial' ? t('subscription.trial') : status.subscriptionStatus}
              </h5>
              {status.daysRemaining > 0 && (
                <small>{t('subscription.daysRemaining')}: {status.daysRemaining}</small>
              )}
            </div>
            <div className="text-end">
              {status.isExpired && <span className="badge badge-danger">{t('subscriptionPage.expired')}</span>}
              {!status.isExpired && <span className="badge badge-success">{t('subscriptionPage.active')}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="row g-3">
        {plans.map(plan => (
          <div key={plan._id} className="col-md-4">
            <div className={`glass-card p-4 text-center ${plan.isPopular ? 'border border-primary' : ''}`}>
              {plan.isPopular && <span className="badge badge-primary mb-2">{t('subscriptionPage.popular')}</span>}
              <h5>{plan.name}</h5>
              <h2 className="my-3" style={{ color: 'var(--primary-color)' }}>₹{plan.price}</h2>
              <small className="d-block mb-3">{plan.duration === 'monthly' ? t('subscription.monthly') : plan.duration === 'quarterly' ? t('subscription.quarterly') : t('subscription.yearly')}</small>
              <ul className="list-unstyled mb-4">
                {(plan.features || []).map((f, i) => <li key={i} className="mb-2">✓ {f}</li>)}
              </ul>
              <button className="btn btn-primary-custom w-100" onClick={() => handleSubscribe(plan._id)}>
                {t('subscription.subscribe')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;