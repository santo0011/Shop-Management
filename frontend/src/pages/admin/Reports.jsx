import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import Chart from 'react-apexcharts';

const Reports = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('sales');
  const [salesReport, setSalesReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [expenseReport, setExpenseReport] = useState(null);

  useEffect(() => {
    if (activeTab === 'sales') fetchSalesReport();
    if (activeTab === 'profit') fetchProfitReport();
    if (activeTab === 'expenses') fetchExpenseReport();
  }, [activeTab]);

  const fetchSalesReport = async () => {
    try {
      const { data } = await api.get('/reports/sales');
      setSalesReport(data);
    } catch (err) { console.error(err); }
  };

  const fetchProfitReport = async () => {
    try {
      const { data } = await api.get('/reports/profit');
      setProfitReport(data);
    } catch (err) { console.error(err); }
  };

  const fetchExpenseReport = async () => {
    try {
      const { data } = await api.get('/reports/expenses');
      setExpenseReport(data);
    } catch (err) { console.error(err); }
  };

  const tabs = [
    { key: 'sales', label: t('report.dailySales') },
    { key: 'profit', label: t('report.profitReport') },
    { key: 'expenses', label: t('report.expenseReport') },
    { key: 'stock', label: t('report.stockReport') },
    { key: 'customer-due', label: t('report.customerDue') },
    { key: 'supplier-due', label: t('report.supplierDue') },
  ];

  const chartOptions = {
    chart: { type: 'bar', height: 350, foreColor: 'var(--text-secondary)' },
    xaxis: { categories: [] },
    theme: { mode: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
  };

  const reportContent = () => {
    switch(activeTab) {
      case 'sales':
        return (
          <div className="glass-card p-3">
            <h6 className="mb-3">{t('report.dailySales')}</h6>
            {salesReport?.totals && (
              <div className="row g-3 mb-3">
                <div className="col-md-3"><div className="p-3 rounded" style={{background:'var(--bg-primary)'}}><small>{t('sale.total')}</small><h4>৳{salesReport.totals.totalSales}</h4></div></div>
                <div className="col-md-3"><div className="p-3 rounded" style={{background:'var(--bg-primary)'}}><small>{t('sale.discount')}</small><h4>৳{salesReport.totals.totalDiscount}</h4></div></div>
                <div className="col-md-3"><div className="p-3 rounded" style={{background:'var(--bg-primary)'}}><small>{t('sale.tax')}</small><h4>৳{salesReport.totals.totalTax}</h4></div></div>
                <div className="col-md-3"><div className="p-3 rounded" style={{background:'var(--bg-primary)'}}><small>{t('sale.invoice')} Count</small><h4>{salesReport.totals.count}</h4></div></div>
              </div>
            )}
          </div>
        );
      case 'profit':
        return (
          <div className="glass-card p-3">
            <h6 className="mb-3">{t('report.profitReport')}</h6>
            {profitReport && (
              <div className="row g-3">
                <div className="col-md-4"><div className="p-3 rounded stat-primary"><small>Revenue</small><h4>৳{profitReport.revenue}</h4></div></div>
                <div className="col-md-4"><div className="p-3 rounded stat-danger"><small>COGS</small><h4>৳{profitReport.cogs}</h4></div></div>
                <div className="col-md-4"><div className="p-3 rounded stat-success"><small>{t('dashboard.totalProfit')}</small><h4>৳{profitReport.netProfit}</h4></div></div>
                <div className="col-12"><div className="p-3 rounded" style={{background:'var(--bg-primary)'}}><small>Profit Margin</small><h4>{profitReport.profitMargin}%</h4></div></div>
              </div>
            )}
          </div>
        );
      default:
        return <div className="glass-card p-3 text-center py-5" style={{color:'var(--text-muted)'}}>{t('common.noData')}</div>;
    }
  };

  return (
    <div>
      <h4 className="mb-3">{t('nav.reports')}</h4>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.key} className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary-custom' : 'btn-outline-secondary'}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      {reportContent()}
    </div>
  );
};

export default Reports;