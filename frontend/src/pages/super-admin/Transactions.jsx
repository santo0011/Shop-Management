import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const Transactions = () => {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/subscription/all', { _skipLoading: true });
        setSubscriptions(data.subscriptions);
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  return (
    <div className="table-container">
      <div className="table-header">
        <h5>{t('nav.transactions')}</h5>
      </div>
      <div className="table-responsive">
        <table className="table table-custom mb-0">
          <thead><tr><th>{t('transactionsPage.shop')}</th><th>{t('transactionsPage.plan')}</th><th>{t('transactionsPage.amount')}</th><th>{t('transactionsPage.status')}</th><th>{t('transactionsPage.date')}</th></tr></thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub._id}>
                <td>{sub.shop?.name || t('common.notAvailable')}</td>
                <td>{sub.plan?.name || t('common.notAvailable')}</td>
                <td>₹{sub.totalAmount}</td>
                <td><span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{sub.status === 'active' ? t('common.active') : t('subscriptionPage.expired')}</span></td>
                <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;