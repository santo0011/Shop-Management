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
          <thead><tr><th>Shop</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub._id}>
                <td>{sub.shop?.name || 'N/A'}</td>
                <td>{sub.plan?.name || 'N/A'}</td>
                <td>₹{sub.totalAmount}</td>
                <td><span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{sub.status}</span></td>
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