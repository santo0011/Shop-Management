import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiStore, BiCreditCard, BiDollar, BiTrendingUp } from 'react-icons/bi';

const SuperDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchRevenue();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/shops/stats');
      setStats(data);
    } catch (err) { console.error(err); }
  };

  const fetchRevenue = async () => {
    try {
      const { data } = await api.get('/subscription/revenue');
      setRevenue(data);
    } catch (err) { console.error(err); }
  };

  const cards = [
    { icon: BiStore, label: 'Total Shops', value: stats?.totalShops || 0, color: 'primary' },
    { icon: BiTrendingUp, label: 'Active Shops', value: stats?.activeShops || 0, color: 'success' },
    { icon: BiCreditCard, label: 'Active Subs', value: stats?.activeSubscriptions || 0, color: 'info' },
    { icon: BiDollar, label: 'Total Revenue', value: revenue?.totalRevenue || 0, color: 'warning', prefix: '৳' },
  ];

  return (
    <div>
      <h4 className="mb-4">Super Admin Dashboard</h4>
      <div className="row g-3 mb-4">
        {cards.map((card, i) => (
          <div key={i} className="col-6 col-md-3">
            <div className={`stat-card stat-${card.color} glass-card`}>
              <div className="stat-icon"><card.icon /></div>
              <div className="stat-value">{card.prefix}{card.value.toLocaleString()}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperDashboard;