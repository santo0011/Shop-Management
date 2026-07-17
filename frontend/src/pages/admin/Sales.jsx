import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Sales = () => {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/sales');
        setSales(data.sales);
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  return (
    <div className="table-container">
      <div className="table-header">
        <h5>{t('nav.sales')}</h5>
        <Link to="/pos" className="btn btn-primary-custom btn-sm">{t('sale.newSale')}</Link>
      </div>
      <div className="table-responsive">
        <table className="table table-custom mb-0">
          <thead><tr><th>{t('sale.invoiceNo')}</th><th>{t('sale.customer')}</th><th>{t('sale.total')}</th><th>{t('common.paid')}</th><th>{t('common.due')}</th><th>{t('common.status')}</th><th>{t('sale.paymentMethod')}</th></tr></thead>
          <tbody>
            {sales.map(s => (
              <tr key={s._id}>
                <td>{s.invoiceNo}</td>
                <td>{s.customer?.name || 'Walk-in'}</td>
                <td>৳{s.totalAmount}</td>
                <td>৳{s.paidAmount}</td>
                <td>৳{s.dueAmount}</td>
                <td><span className={`badge ${s.paymentStatus === 'paid' ? 'badge-success' : s.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger'}`}>{s.paymentStatus}</span></td>
                <td>{s.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;