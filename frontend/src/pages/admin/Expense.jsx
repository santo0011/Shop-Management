import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiPlus } from 'react-icons/bi';

const Expense = () => {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: '', categoryBn: '', amount: '', description: '', paymentMethod: 'cash' });
  const categories = ['Rent', 'Utilities', 'Salary', 'Maintenance', 'Transport', 'Marketing', 'Others'];
  const categoriesBn = ['ভাড়া', 'ইউটিলিটি', 'বেতন', 'রক্ষণাবেক্ষণ', 'পরিবহন', 'মার্কেটিং', 'অন্যান্য'];

  useEffect(() => { 
    api.get('/expenses').then(({data}) => setExpenses(data.expenses)).catch(() => {}); 
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', form);
      setShowModal(false);
      setForm({ category: '', categoryBn: '', amount: '', description: '', paymentMethod: 'cash' });
      const { data } = await api.get('/expenses');
      setExpenses(data.expenses);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="table-container">
        <div className="table-header">
          <h5>{t('nav.expenses')}</h5>
          <button className="btn btn-primary-custom btn-sm" onClick={() => setShowModal(true)}><BiPlus /> {t('common.create')}</button>
        </div>
        <div className="table-responsive">
          <table className="table table-custom mb-0">
            <thead><tr><th>{t('product.category')}</th><th>{t('sale.total')}</th><th>Date</th><th>{t('sale.paymentMethod')}</th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e._id}>
                  <td>{e.category}</td>
                  <td>৳{e.amount}</td>
                  <td>{new Date(e.expenseDate).toLocaleDateString()}</td>
                  <td>{e.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              <div className="modal-header border-0"><h5>{t('common.create')} {t('nav.expenses')}</h5><button type="button" className="btn-close" onClick={() => setShowModal(false)} /></div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">{t('product.category')}</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                      <option value="">Select</option>
                      {categories.map((c, i) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('sale.total')}</label>
                    <input type="number" className="form-control" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('sale.paymentMethod')}</label>
                    <select className="form-select" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile_banking">Mobile Banking</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary-custom">{t('common.save')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expense;