import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { updateProfile } from '../../redux/slices/authSlice';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import {
  BiSave, BiTag, BiReceipt, BiStore, BiBarcode, BiCloudDownload, BiCloudUpload,
  BiShieldQuarter, BiUserCircle, BiLockAlt, BiEnvelope, BiPhone, BiImage,
  BiHide, BiShow, BiChevronDown,
} from 'react-icons/bi';

const SECTIONS = [
  { key: 'shop', label: 'Shop Information', icon: BiStore, description: 'Basic details shown on invoices and receipts' },
  { key: 'tax', label: 'Tax & VAT', icon: BiTag, description: 'The tax rate applied to every POS sale' },
  { key: 'invoice', label: 'Invoice & Print', icon: BiReceipt, description: 'Numbering and footer message for invoices' },
  { key: 'barcode', label: 'Barcode Settings', icon: BiBarcode, description: 'Default format used when generating product barcodes' },
  { key: 'backup', label: 'Backup & Restore', icon: BiCloudDownload, description: 'Export or import your shop data as a JSON file' },
  { key: 'security', label: 'Security', icon: BiShieldQuarter, description: 'Account activity and active sessions' },
  { key: 'profile', label: 'Profile', icon: BiUserCircle, description: 'Your personal name, phone, and avatar' },
  { key: 'password', label: 'Change Password', icon: BiLockAlt, description: "Use a strong password that you don't use elsewhere" },
];

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="settings-card-header">
    <div className="settings-card-icon"><Icon /></div>
    <div>
      <h5>{title}</h5>
      {description && <p>{description}</p>}
    </div>
  </div>
);

const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'CODE128' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'UPC', label: 'UPC' },
  { value: 'CODE39', label: 'CODE39' },
];

const emptyAddress = { street: '', city: '', state: '', zipCode: '', country: '' };

const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [activeSection, setActiveSection] = useState('shop');
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shop, setShop] = useState(null);
  const [shopForm, setShopForm] = useState({ name: '', email: '', phone: '', logo: '', address: emptyAddress });
  const [taxForm, setTaxForm] = useState({ taxRate: 0, taxName: 'VAT' });
  const [invoiceForm, setInvoiceForm] = useState({ invoicePrefix: '', receiptFooter: '' });
  const [barcodeForm, setBarcodeForm] = useState({ barcodePrefix: '', barcodeSymbology: 'CODE128', autoGenerateBarcode: false });

  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', avatar: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [{ data: shopData }, { data: profile }] = await Promise.all([
        api.get('/shops/my'),
        api.get('/auth/profile'),
      ]);
      const s = shopData.shop || shopData;
      setShop(s);
      setShopForm({
        name: s.name || '',
        email: s.email || '',
        phone: s.phone || '',
        logo: s.logo || '',
        address: {
          street: s.address?.street || '',
          city: s.address?.city || '',
          state: s.address?.state || '',
          zipCode: s.address?.zipCode || '',
          country: s.address?.country || '',
        },
      });
      setTaxForm({ taxRate: s.settings?.taxRate ?? 0, taxName: s.settings?.taxName || 'VAT' });
      setInvoiceForm({ invoicePrefix: s.settings?.invoicePrefix || 'INV-', receiptFooter: s.settings?.receiptFooter || '' });
      setBarcodeForm({
        barcodePrefix: s.settings?.barcodePrefix || '',
        barcodeSymbology: s.settings?.barcodeSymbology || 'CODE128',
        autoGenerateBarcode: !!s.settings?.autoGenerateBarcode,
      });
      setProfileData(profile);
      setProfileForm({ name: profile.name || '', phone: profile.phone || '', avatar: profile.avatar || '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Shop-level settings (tax / invoice / barcode) share one endpoint ────
  const saveShopSettings = async (fields, successMsg) => {
    setSaving(true);
    try {
      const { data } = await api.put('/shops/settings', fields);
      setShop(data);
      showToast.success(successMsg);
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShop = async () => {
    if (!shop?._id) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/shops/${shop._id}`, {
        name: shopForm.name,
        email: shopForm.email,
        phone: shopForm.phone,
        logo: shopForm.logo,
        address: shopForm.address,
      });
      setShop(data);
      showToast.success('Shop information saved');
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to save shop information');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTax = () => saveShopSettings(
    { taxRate: taxForm.taxRate, taxName: taxForm.taxName },
    'Tax settings saved'
  );

  const handleSaveInvoice = () => saveShopSettings(
    { invoicePrefix: invoiceForm.invoicePrefix, receiptFooter: invoiceForm.receiptFooter },
    'Invoice settings saved'
  );

  const handleSaveBarcode = () => saveShopSettings(
    { barcodePrefix: barcodeForm.barcodePrefix, barcodeSymbology: barcodeForm.barcodeSymbology, autoGenerateBarcode: barcodeForm.autoGenerateBarcode },
    'Barcode settings saved'
  );

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        avatar: profileForm.avatar,
      });
      dispatch(updateProfile(data));
      setProfileData(prev => ({ ...prev, ...data }));
      showToast.success('Profile saved');
    } catch (err) {
      showToast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast.error('Please fill in all password fields');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast.error('New password and confirmation do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  // ─── Backup & Restore ────────────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const { data } = await api.get('/shops/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast.success('Backup downloaded');
    } catch (err) {
      showToast.error('Failed to generate backup');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleRestoreFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        setRestoreFile({ name: file.name, data: parsed });
      } catch (err) {
        showToast.error('Invalid backup file');
        setRestoreFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!restoreFile) return;
    Swal.fire({
      title: 'Restore from backup?',
      text: `This will overwrite any existing products, categories, suppliers, and customers that match records in "${restoreFile.name}". This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, restore',
      cancelButtonText: 'Cancel',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      setRestoring(true);
      try {
        const { products, categories, suppliers, customers } = restoreFile.data || {};
        const { data } = await api.post('/shops/restore', { products, categories, suppliers, customers });
        showToast.success(
          `Restored ${data.products.restored} products, ${data.categories.restored} categories, ${data.suppliers.restored} suppliers, ${data.customers.restored} customers`
        );
        setRestoreFile(null);
      } catch (err) {
        showToast.error('Restore failed');
      } finally {
        setRestoring(false);
      }
    });
  };

  // ─── Security ────────────────────────────────────────────────────────
  const handleSignOutAllDevices = () => {
    Swal.fire({
      title: 'Sign out from all devices?',
      text: 'You will be signed out here and on every other device. You will need to log in again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, sign out everywhere',
      cancelButtonText: 'Cancel',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await api.post('/auth/logout');
      } catch (err) {
        // Still clear the local session even if the server call fails.
      } finally {
        localStorage.clear();
        window.location.href = '/login';
      }
    });
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const SAVE_ACTIONS = {
    shop: { label: 'Save Shop Information', onSave: handleSaveShop },
    tax: { label: 'Save Tax Settings', onSave: handleSaveTax },
    invoice: { label: 'Save Invoice Settings', onSave: handleSaveInvoice },
    barcode: { label: 'Save Barcode Settings', onSave: handleSaveBarcode },
    profile: { label: 'Save Profile', onSave: handleSaveProfile },
    password: { label: 'Update Password', onSave: handleChangePassword },
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <span className="spinner-border" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const renderSection = (key) => {
    switch (key) {
      case 'shop':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiStore} title="Shop Information" description="Basic details shown on invoices and receipts" />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3">
                  <label className="form-label">Shop Name</label>
                  <input className="form-control" value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label"><BiEnvelope style={{ marginRight: 4 }} /> Email</label>
                  <input type="email" className="form-control" value={shopForm.email} onChange={e => setShopForm({ ...shopForm, email: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label"><BiPhone style={{ marginRight: 4 }} /> Phone</label>
                  <input className="form-control" value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label"><BiImage style={{ marginRight: 4 }} /> Logo URL</label>
                  <input className="form-control" value={shopForm.logo} onChange={e => setShopForm({ ...shopForm, logo: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              {shopForm.logo && (
                <div className="mb-3">
                  <img src={shopForm.logo} alt="Shop logo preview" style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }} />
                </div>
              )}
              <hr style={{ borderColor: 'var(--border-color)' }} />
              <label className="form-label">Address</label>
              <div className="settings-field-row">
                <div className="mb-3">
                  <input className="form-control" placeholder="Street" value={shopForm.address.street} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, street: e.target.value } })} />
                </div>
                <div className="mb-3">
                  <input className="form-control" placeholder="City" value={shopForm.address.city} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, city: e.target.value } })} />
                </div>
                <div className="mb-3">
                  <input className="form-control" placeholder="State" value={shopForm.address.state} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, state: e.target.value } })} />
                </div>
                <div className="mb-3">
                  <input className="form-control" placeholder="ZIP / Postal Code" value={shopForm.address.zipCode} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, zipCode: e.target.value } })} />
                </div>
                <div className="mb-3">
                  <input className="form-control" placeholder="Country" value={shopForm.address.country} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, country: e.target.value } })} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'tax':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiTag} title={t('settings.taxSettings')} description="The tax rate applied to every POS sale" />
            <div className="p-4">
              <div className="mb-3">
                <label className="form-label">Tax Rate (%)</label>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <input
                    type="number"
                    className="form-control"
                    style={{ maxWidth: '120px' }}
                    value={taxForm.taxRate}
                    onChange={e => setTaxForm({ ...taxForm, taxRate: Math.max(0, Math.min(100, Number(e.target.value))) })}
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                  <div className="d-flex gap-1 ms-2 flex-wrap">
                    {[0, 5, 10, 15].map(val => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-premium btn-premium-sm ${taxForm.taxRate === val ? 'btn-premium-primary' : 'btn-premium-secondary'}`}
                        onClick={() => setTaxForm({ ...taxForm, taxRate: val })}
                      >
                        {val === 0 ? 'No Tax' : `${val}%`}
                      </button>
                    ))}
                  </div>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                  Set 0% for no tax. This is applied on all POS invoices.
                </small>
              </div>
              <div className="mb-3">
                <label className="form-label">Tax Name</label>
                <input
                  className="form-control"
                  style={{ maxWidth: '220px' }}
                  value={taxForm.taxName}
                  onChange={e => setTaxForm({ ...taxForm, taxName: e.target.value })}
                  placeholder="e.g. VAT, GST, Sales Tax"
                />
              </div>
            </div>
          </div>
        );

      case 'invoice':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiReceipt} title={t('settings.invoiceSettings')} description="Numbering and footer message for invoices" />
            <div className="p-4">
              <div className="mb-3">
                <label className="form-label">Invoice Number Prefix</label>
                <input
                  className="form-control"
                  style={{ maxWidth: '220px' }}
                  value={invoiceForm.invoicePrefix}
                  onChange={e => setInvoiceForm({ ...invoiceForm, invoicePrefix: e.target.value })}
                  placeholder="e.g. INV-"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Invoice Footer Message</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={invoiceForm.receiptFooter}
                  onChange={e => setInvoiceForm({ ...invoiceForm, receiptFooter: e.target.value })}
                  placeholder="Thank you for shopping with us."
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                  This message appears at the bottom of every invoice and receipt.
                </small>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>
                Paper size and template (A4 / 58mm / 80mm) can be chosen from the Printer Settings button on the POS and Sales pages.
              </small>
            </div>
          </div>
        );

      case 'barcode':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiBarcode} title="Barcode Settings" description="Default format used when generating product barcodes" />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3">
                  <label className="form-label">Barcode Format</label>
                  <select className="form-select" value={barcodeForm.barcodeSymbology} onChange={e => setBarcodeForm({ ...barcodeForm, barcodeSymbology: e.target.value })}>
                    {BARCODE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Barcode Prefix</label>
                  <input className="form-control" value={barcodeForm.barcodePrefix} onChange={e => setBarcodeForm({ ...barcodeForm, barcodePrefix: e.target.value })} placeholder="e.g. SHOP-" />
                </div>
              </div>
              <div className="mb-2">
                <label className="printer-settings-checkbox">
                  <input
                    type="checkbox"
                    checked={barcodeForm.autoGenerateBarcode}
                    onChange={e => setBarcodeForm({ ...barcodeForm, autoGenerateBarcode: e.target.checked })}
                  />
                  <span>Auto-generate barcodes for new products</span>
                </label>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>
                Used as the default format and prefix when generating barcodes for new products.
              </small>
            </div>
          </div>
        );

      case 'backup':
        return (
          <>
            <div className="settings-card mb-4">
              <SectionHeader icon={BiCloudDownload} title="Download Backup" description="Export your shop data as a single JSON file" />
              <div className="p-4">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Export your shop information, products, categories, suppliers, and customers as a single JSON file.
                </p>
                <button type="button" className="btn-premium btn-premium-primary" onClick={handleDownloadBackup} disabled={downloadingBackup}>
                  {downloadingBackup ? <><span className="spinner-border spinner-border-sm" /> Preparing...</> : <><BiCloudDownload /> Download Backup</>}
                </button>
              </div>
            </div>
            <div className="settings-card">
              <SectionHeader icon={BiCloudUpload} title="Restore from Backup" description="Import products, categories, suppliers, and customers" />
              <div className="p-4">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Upload a previously downloaded backup file to restore your products, categories, suppliers, and customers. Matching records are overwritten.
                </p>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="btn-premium btn-premium-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                    <BiCloudUpload /> Choose File
                    <input type="file" accept="application/json" onChange={handleRestoreFileChange} style={{ display: 'none' }} />
                  </label>
                  {restoreFile && <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{restoreFile.name}</span>}
                  <button type="button" className="btn-premium btn-premium-primary" onClick={handleRestore} disabled={!restoreFile || restoring}>
                    {restoring ? <><span className="spinner-border spinner-border-sm" /> Restoring...</> : 'Restore'}
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      case 'security':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiShieldQuarter} title="Security" description="Account activity and active sessions" />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{profileData?.email || '—'}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{profileData?.role || '—'}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Last Login</label>
                  <div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{formatDateTime(profileData?.lastLogin)}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Member Since</label>
                  <div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{formatDateTime(profileData?.createdAt)}</div>
                </div>
              </div>
              <hr style={{ borderColor: 'var(--border-color)' }} />
              <label className="form-label">Sessions</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                If you suspect your account is signed in somewhere it shouldn't be, sign out everywhere and log back in.
              </p>
              <button type="button" className="btn-premium" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleSignOutAllDevices}>
                Sign Out From All Devices
              </button>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiUserCircle} title="Profile" description="Your personal name, phone, and avatar" />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3">
                  <label className="form-label">{t('auth.name')}</label>
                  <input className="form-control" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('auth.phone')}</label>
                  <input className="form-control" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{profileData?.email || '—'}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label"><BiImage style={{ marginRight: 4 }} /> Avatar URL</label>
                  <input className="form-control" value={profileForm.avatar} onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="settings-card" style={{ maxWidth: '520px' }}>
            <SectionHeader icon={BiLockAlt} title="Change Password" description="Use a strong password that you don't use elsewhere" />

            {/* ── Fields ── */}
            <div style={{ padding: '20px 24px 16px' }}>
              {[
                { key: 'current', label: 'Current Password', field: 'currentPassword', autoComplete: 'current-password' },
                { key: 'new', label: 'New Password', field: 'newPassword', autoComplete: 'new-password' },
                { key: 'confirm', label: 'Confirm New Password', field: 'confirmPassword', autoComplete: 'new-password' },
              ].map(({ key, label, field, autoComplete }) => (
                <div key={key} style={{ marginBottom: key === 'confirm' ? '12px' : '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    {label}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--bg-input)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                      overflow: 'hidden',
                    }}
                    className="password-input-wrapper"
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 42,
                        flexShrink: 0,
                        color: 'var(--text-muted)',
                        fontSize: '1.05rem',
                      }}
                    >
                      <BiLockAlt />
                    </span>
                    <input
                      type={showPassword[key] ? 'text' : 'password'}
                      value={passwordForm[field]}
                      onChange={e => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                      autoComplete={autoComplete}
                      placeholder={key === 'current' ? 'Enter current password' : key === 'new' ? 'Enter new password' : 'Confirm new password'}
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontFamily: 'var(--font-family)',
                        padding: '10px 0',
                        minHeight: 42,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        flexShrink: 0,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '1.15rem',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'color 200ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      tabIndex={-1}
                    >
                      {showPassword[key] ? <BiHide /> : <BiShow />}
                    </button>
                  </div>
                  {key === 'confirm' && (
                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.75rem',
                        color: passwordForm.newPassword && passwordForm.newPassword.length >= 6
                          ? 'var(--secondary)'
                          : 'var(--text-muted)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span>Must be at least 6 characters.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const saveAction = SAVE_ACTIONS[activeSection];

  return (
    <div>
      <div className="mb-4">
        <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.settings')}</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Manage your shop, invoicing, security, and account preferences.</p>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          {SECTIONS.map(section => (
            <button
              key={section.key}
              type="button"
              className={`settings-nav-item ${activeSection === section.key ? 'active' : ''}`}
              onClick={() => setActiveSection(section.key)}
            >
              <section.icon /> <span>{section.label}</span>
            </button>
          ))}
        </aside>

        <div className="settings-content">
          {renderSection(activeSection)}

          {saveAction && (
            <div className="settings-save-bar">
              <span className="settings-save-hint">Changes are saved only when you click {saveAction.label}.</span>
              <button type="button" className="btn-premium btn-premium-primary" onClick={saveAction.onSave} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiSave /> {saveAction.label}</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile accordion — replaces the sidebar/content layout below 768px */}
      <div className="settings-accordion">
        {SECTIONS.map(section => {
          const isOpen = mobileExpanded === section.key;
          const sectionSaveAction = SAVE_ACTIONS[section.key];
          return (
            <div key={section.key} className={`settings-accordion-item ${isOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="settings-accordion-header"
                onClick={() => setMobileExpanded(isOpen ? null : section.key)}
              >
                <span className="settings-accordion-header-left"><section.icon /> {section.label}</span>
                <BiChevronDown className="settings-accordion-chevron" />
              </button>
              {isOpen && (
                <div className="settings-accordion-body">
                  {renderSection(section.key)}
                  {sectionSaveAction && (
                    <div className="settings-accordion-save">
                      <button type="button" className="btn-premium btn-premium-primary" onClick={sectionSaveAction.onSave} disabled={saving}>
                        {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiSave /> {sectionSaveAction.label}</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;
