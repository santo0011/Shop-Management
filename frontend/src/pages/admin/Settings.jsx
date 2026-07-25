import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { updateProfile } from '../../redux/slices/authSlice';
import { setMyShop } from '../../redux/slices/shopSlice';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import {
  BiSave, BiTag, BiReceipt, BiStore, BiBarcode, BiCloudDownload, BiCloudUpload,
  BiShieldQuarter, BiUserCircle, BiLockAlt, BiEnvelope, BiPhone, BiImage,
  BiHide, BiShow, BiChevronDown, BiPrinter, BiFile, BiGridSmall, BiLayout,
  BiCheck, BiNote, BiCopyright, BiBook, BiCodeAlt, BiExpandVertical, BiQr, BiCode, BiBookContent,
  BiBriefcase, BiPlus, BiX, BiRefresh,
} from 'react-icons/bi';
import { MODULE_KEYS, GLOBAL_UNITS, BUSINESS_TYPE_KEYS, BUSINESS_TYPES, getBusinessTypeDefaults } from '../../config/businessTypes';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
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

const PAPER_SIZES = [
  { value: '58mm', label: '58mm (Thermal)', icon: <BiGridSmall size={18} /> },
  { value: '80mm', label: '80mm (Thermal)', icon: <BiGridSmall size={18} /> },
  { value: 'a4', label: 'A4 (Laser/Inkjet)', icon: <BiFile size={18} /> },
];

const INVOICE_TEMPLATES = [
  { value: 'classic', label: 'Classic', icon: <BiLayout size={18} /> },
  { value: 'modern', label: 'Modern', icon: <BiFile size={18} /> },
  { value: 'minimal', label: 'Minimal', icon: <BiGridSmall size={18} /> },
  { value: 'grocery', label: 'Grocery', icon: <BiStore size={18} /> },
];

const PRINT_MODES = [
  { value: 'thermal', label: 'Thermal (Receipt Printer)' },
  { value: 'normal', label: 'Normal (Standard Printer)' },
];

const emptyAddress = { street: '', city: '', state: '', zipCode: '', country: '' };

const mergeModules = (businessType, shopModules) => {
  const explicit = Object.fromEntries(Object.entries(shopModules || {}).filter(([, v]) => v !== undefined));
  return { ...getBusinessTypeDefaults(businessType).modules, ...explicit };
};

const SettingsSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <div className="mb-4">
      <div style={{ height: 28, width: '35%', marginBottom: 8, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 14, width: '25%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
    </div>
    <div className="settings-layout" style={{ display: 'flex', gap: '1.5rem' }}>
      <aside className="settings-sidebar" style={{ flex: '0 0 240px' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ height: 42, marginBottom: 4, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 10, animation: 'shimmer 1.5s infinite' }} />
        ))}
      </aside>
      <div className="settings-content" style={{ flex: 1 }}>
        <div className="settings-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
          <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 18, width: '40%', marginBottom: 6, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
              <div style={{ height: 12, width: '60%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
            </div>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ marginBottom: '1.25rem' }}>
                <div style={{ height: 12, width: '20%', marginBottom: 8, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
                <div style={{ height: 42, width: '100%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
              </div>
            ))}
            <div style={{ height: 42, width: '30%', marginTop: '0.5rem', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const SECTIONS = [
    { key: 'shop', label: t('settingsPage.shopInformation'), icon: BiStore, description: t('settingsPage.shopInfoDesc') },
    { key: 'business', label: t('settingsPage.businessConfig'), icon: BiBriefcase, description: t('settingsPage.businessConfigDesc') },
    { key: 'gst', label: 'GST Settings', icon: BiTag, description: 'Configure GST settings — business state, GST number, default rates, and round-off preferences' },
    { key: 'invoice', label: t('settingsPage.invoicePrint'), icon: BiReceipt, description: 'Configure invoice prefix, receipt footer, paper size, design, and print preferences' },
    { key: 'barcode', label: t('settingsPage.barcodeSettings'), icon: BiBarcode, description: t('settingsPage.barcodeSectionDesc') },
    { key: 'pos', label: t('settingsPage.posDisplaySettings'), icon: BiGridSmall, description: t('settingsPage.posDisplaySettingsDesc') },
    { key: 'backup', label: t('settingsPage.backupRestore'), icon: BiCloudDownload, description: t('settingsPage.backupSectionDesc') },
    { key: 'security', label: t('settingsPage.security'), icon: BiShieldQuarter, description: t('settingsPage.securitySectionDesc') },
    { key: 'profile', label: t('common.profile'), icon: BiUserCircle, description: t('settingsPage.profileSectionDesc') },
    { key: 'password', label: t('settingsPage.changePassword'), icon: BiLockAlt, description: t('settingsPage.changePasswordDesc') },
  ];

  const [activeSection, setActiveSection] = useState('shop');
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [mobileInvoiceSub, setMobileInvoiceSub] = useState(null);
  const [saving, setSaving] = useState(false);

  const [shop, setShop] = useState(null);
  const [shopForm, setShopForm] = useState({ name: '', email: '', phone: '', logo: '', address: emptyAddress });
  const [gstForm, setGstForm] = useState({ gstEnabled: true, gstNumber: '', defaultGstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, businessState: 'West Bengal', roundOffEnabled: true });
  const [invoiceForm, setInvoiceForm] = useState({ invoicePrefix: '', receiptFooter: '' });
  const [printForm, setPrintForm] = useState({
    paperSize: '80mm',
    invoiceTemplate: 'modern',
    printMode: 'thermal',
    autoPrint: true,
    printCopies: 1,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    showLogo: true,
    showQR: true,
    showBarcode: false,
    showHeader: true,
    showFooter: true,
  });
  const [barcodeForm, setBarcodeForm] = useState({ barcodePrefix: '', barcodeSymbology: 'CODE128', autoGenerateBarcode: false });
  const [posDisplayForm, setPosDisplayForm] = useState({ desktop: 20, mobile: 10 });
  const [businessTypeSelect, setBusinessTypeSelect] = useState('grocery');
  const [businessTypeLocked, setBusinessTypeLocked] = useState(false);
  const [enabledModules, setEnabledModules] = useState({});
  const [customUnits, setCustomUnits] = useState([]);
  const [newUnit, setNewUnit] = useState({ label: '', labelBn: '' });
  const [savingModuleKey, setSavingModuleKey] = useState(null);

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
        api.get('/shops/my', { _skipLoading: true }),
        api.get('/auth/profile', { _skipLoading: true }),
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
      setGstForm({
        gstEnabled: s.settings?.gstEnabled !== undefined ? s.settings.gstEnabled : true,
        gstNumber: s.settings?.gstNumber || '',
        defaultGstRate: s.settings?.defaultGstRate ?? 18,
        cgstRate: s.settings?.cgstRate ?? 9,
        sgstRate: s.settings?.sgstRate ?? 9,
        igstRate: s.settings?.igstRate ?? 18,
        businessState: s.settings?.businessState || 'West Bengal',
        roundOffEnabled: s.settings?.roundOffEnabled !== undefined ? s.settings.roundOffEnabled : true,
      });
      setInvoiceForm({ invoicePrefix: s.settings?.invoicePrefix || 'INV-', receiptFooter: s.settings?.receiptFooter || '' });
      setPrintForm({
        paperSize: s.settings?.paperSize || '80mm',
        invoiceTemplate: s.settings?.invoiceTemplate || 'modern',
        printMode: s.settings?.printMode || 'thermal',
        autoPrint: s.settings?.autoPrint !== undefined ? s.settings.autoPrint : true,
        printCopies: s.settings?.printCopies || 1,
        marginTop: s.settings?.marginTop || 0,
        marginBottom: s.settings?.marginBottom || 0,
        marginLeft: s.settings?.marginLeft || 0,
        marginRight: s.settings?.marginRight || 0,
        showLogo: s.settings?.showLogo !== undefined ? s.settings.showLogo : true,
        showQR: s.settings?.showQR !== undefined ? s.settings.showQR : true,
        showBarcode: s.settings?.showBarcode || false,
        showHeader: s.settings?.showHeader !== undefined ? s.settings.showHeader : true,
        showFooter: s.settings?.showFooter !== undefined ? s.settings.showFooter : true,
      });
      setBarcodeForm({
        barcodePrefix: s.settings?.barcodePrefix || '',
        barcodeSymbology: s.settings?.barcodeSymbology || 'CODE128',
        autoGenerateBarcode: !!s.settings?.autoGenerateBarcode,
      });
      setPosDisplayForm({
        desktop: s.settings?.posDisplayLimit?.desktop || 20,
        mobile: s.settings?.posDisplayLimit?.mobile || 10,
      });
      setBusinessTypeSelect(s.businessType || 'grocery');
      setBusinessTypeLocked((s.productCount || 0) > 0);
      setEnabledModules(mergeModules(s.businessType, s.settings?.enabledModules));
      setCustomUnits(s.settings?.customUnits || []);
      setProfileData(profile);
      setProfileForm({ name: profile.name || '', phone: profile.phone || '', avatar: profile.avatar || '' });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const saveShopSettings = async (fields, successMsg) => {
    setSaving(true);
    try {
      const { data } = await api.put('/shops/settings', fields, { _skipLoading: true });
      setShop(data);
      dispatch(setMyShop(data));
      showToast.success(successMsg);
      return data;
    } catch (err) {
      if (err.response?.data?.code === 'BUSINESS_TYPE_LOCKED') {
        setBusinessTypeLocked(true);
        showToast.error(t('settingsPage.businessTypeLocked'));
      } else {
        showToast.error(err.response?.data?.message || t('settingsPage.failedToSaveSettings'));
      }
      return null;
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
      }, { _skipLoading: true });
      setShop(data);
      dispatch(setMyShop(data));
      showToast.success(t('settingsPage.shopInfoSaved'));
    } catch (err) {
      showToast.error(err.response?.data?.message || t('settingsPage.failedToSaveShopInfo'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGst = () => saveShopSettings(
    {
      gstEnabled: gstForm.gstEnabled,
      gstNumber: gstForm.gstNumber,
      defaultGstRate: gstForm.defaultGstRate,
      cgstRate: gstForm.cgstRate,
      sgstRate: gstForm.sgstRate,
      igstRate: gstForm.igstRate,
      businessState: gstForm.businessState,
      roundOffEnabled: gstForm.roundOffEnabled,
    },
    'GST settings saved successfully'
  );

  const handleSaveInvoice = () => saveShopSettings(
    {
      invoicePrefix: invoiceForm.invoicePrefix,
      receiptFooter: invoiceForm.receiptFooter,
      paperSize: printForm.paperSize,
      invoiceTemplate: printForm.invoiceTemplate,
      printMode: printForm.printMode,
      autoPrint: printForm.autoPrint,
      printCopies: printForm.printCopies,
      marginTop: printForm.marginTop,
      marginBottom: printForm.marginBottom,
      marginLeft: printForm.marginLeft,
      marginRight: printForm.marginRight,
      showLogo: printForm.showLogo,
      showQR: printForm.showQR,
      showBarcode: printForm.showBarcode,
      showHeader: printForm.showHeader,
      showFooter: printForm.showFooter,
    },
    t('settingsPage.invoiceSettingsSaved')
  );

  const handleSavePrint = () => saveShopSettings(
    {
      paperSize: printForm.paperSize,
      invoiceTemplate: printForm.invoiceTemplate,
      printMode: printForm.printMode,
      autoPrint: printForm.autoPrint,
      printCopies: printForm.printCopies,
      marginTop: printForm.marginTop,
      marginBottom: printForm.marginBottom,
      marginLeft: printForm.marginLeft,
      marginRight: printForm.marginRight,
      showLogo: printForm.showLogo,
      showQR: printForm.showQR,
      showBarcode: printForm.showBarcode,
      showHeader: printForm.showHeader,
      showFooter: printForm.showFooter,
    },
    'Print settings saved successfully'
  );

  const handleSaveBarcode = () => saveShopSettings(
    { barcodePrefix: barcodeForm.barcodePrefix, barcodeSymbology: barcodeForm.barcodeSymbology, autoGenerateBarcode: barcodeForm.autoGenerateBarcode },
    t('settingsPage.barcodeSettingsSaved')
  );

  const handleSavePosDisplay = () => saveShopSettings(
    { posDisplayLimit: { desktop: posDisplayForm.desktop, mobile: posDisplayForm.mobile } },
    t('settingsPage.posDisplaySettingsSaved')
  );

  const handleSaveBusinessType = () => {
    if (businessTypeLocked) {
      showToast.error(t('settingsPage.businessTypeLocked'));
      return;
    }
    return saveShopSettings(
      { businessType: businessTypeSelect },
      t('settingsPage.businessTypeSaved')
    );
  };

  const handleApplyRecommendedModules = async () => {
    const data = await saveShopSettings(
      { businessType: businessTypeSelect, applyRecommendedModules: true },
      t('settingsPage.recommendedModulesApplied')
    );
    if (data) setEnabledModules(mergeModules(data.businessType, data.settings?.enabledModules));
  };

  const handleToggleModule = async (key) => {
    const nextValue = !enabledModules[key];
    setEnabledModules((prev) => ({ ...prev, [key]: nextValue }));
    setSavingModuleKey(key);
    const data = await saveShopSettings({ enabledModules: { [key]: nextValue } }, t('settingsPage.moduleUpdated'));
    if (!data) {
      setEnabledModules((prev) => ({ ...prev, [key]: !nextValue }));
    }
    setSavingModuleKey(null);
  };

  const slugifyUnitKey = (label) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const handleAddUnit = async () => {
    const label = newUnit.label.trim();
    if (!label) {
      showToast.error(t('settingsPage.unitNameRequired'));
      return;
    }
    const key = slugifyUnitKey(label);
    const globalKeys = GLOBAL_UNITS.map((u) => u.key);
    if (!key || globalKeys.includes(key) || customUnits.some((u) => u.key === key)) {
      showToast.error(t('settingsPage.unitAlreadyExists'));
      return;
    }
    const nextUnits = [...customUnits, { key, label, labelBn: newUnit.labelBn.trim() }];
    const data = await saveShopSettings({ customUnits: nextUnits }, t('settingsPage.unitAdded'));
    if (data) {
      setCustomUnits(data.settings?.customUnits || nextUnits);
      setNewUnit({ label: '', labelBn: '' });
    }
  };

  const handleDeleteUnit = async (key) => {
    const nextUnits = customUnits.filter((u) => u.key !== key);
    const data = await saveShopSettings({ customUnits: nextUnits }, t('settingsPage.unitRemoved'));
    if (data) setCustomUnits(data.settings?.customUnits || nextUnits);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        avatar: profileForm.avatar,
      }, { _skipLoading: true });
      dispatch(updateProfile(data));
      setProfileData(prev => ({ ...prev, ...data }));
      showToast.success(t('settingsPage.profileSaved'));
    } catch (err) {
      showToast.error(t('settingsPage.failedToSaveProfile'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast.error(t('settingsPage.fillAllPasswordFields'));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast.error(t('auth.passwordMinLength'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast.error(t('auth.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, { _skipLoading: true });
      showToast.success(t('toast.updateSuccess', { item: t('auth.password') }));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast.error(err.response?.data?.message || t('settingsPage.failedToUpdatePassword'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const { data } = await api.get('/shops/backup', { _skipLoading: true });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast.success(t('settingsPage.backupDownloaded'));
    } catch (err) {
      showToast.error(t('settingsPage.failedToGenerateBackup'));
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
        showToast.error(t('settingsPage.invalidBackupFile'));
        setRestoreFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!restoreFile) return;
    Swal.fire({
      title: t('settingsPage.restoreConfirmTitle'),
      text: t('settingsPage.restoreConfirmText', { fileName: restoreFile.name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t('settingsPage.yesRestore'),
      cancelButtonText: t('common.cancel'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      setRestoring(true);
      try {
        const { products, categories, suppliers, customers } = restoreFile.data || {};
        const { data } = await api.post('/shops/restore', { products, categories, suppliers, customers }, { _skipLoading: true });
        showToast.success(
          t('settingsPage.restoreSuccess', {
            products: data.products.restored,
            categories: data.categories.restored,
            suppliers: data.suppliers.restored,
            customers: data.customers.restored,
          })
        );
        setRestoreFile(null);
      } catch (err) {
        showToast.error(t('settingsPage.restoreFailed'));
      } finally {
        setRestoring(false);
      }
    });
  };

  const handleSignOutAllDevices = () => {
    Swal.fire({
      title: t('settingsPage.signOutConfirmTitle'),
      text: t('settingsPage.signOutConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t('settingsPage.yesSignOutEverywhere'),
      cancelButtonText: t('common.cancel'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await api.post('/auth/logout', {}, { _skipLoading: true });
      } catch (err) {
      } finally {
        const savedLang = localStorage.getItem('appLanguage');
        localStorage.clear();
        if (savedLang) localStorage.setItem('appLanguage', savedLang);
        window.location.href = '/login';
      }
    });
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const SAVE_ACTIONS = {
    shop: { label: t('settingsPage.saveShopInformation'), onSave: handleSaveShop },
    gst: { label: 'Save GST Settings', onSave: handleSaveGst },
    invoice: { label: t('settingsPage.saveInvoiceSettings'), onSave: handleSaveInvoice },
    barcode: { label: t('settingsPage.saveBarcodeSettings'), onSave: handleSaveBarcode },
    pos: { label: t('settingsPage.savePosDisplaySettings'), onSave: handleSavePosDisplay },
    profile: { label: t('settingsPage.saveProfile'), onSave: handleSaveProfile },
    password: { label: t('settingsPage.updatePassword'), onSave: handleChangePassword },
  };

  const INVOICE_SUB_SECTIONS = [
    {
      key: 'invoice', icon: BiReceipt, title: 'Invoice',
      render: () => (
        <div className="mob-inv-field">
          <label className="mob-inv-label">Invoice Prefix</label>
          <input className="mob-inv-input" value={invoiceForm.invoicePrefix} onChange={e => setInvoiceForm({ ...invoiceForm, invoicePrefix: e.target.value })} placeholder="e.g. INV-" />
        </div>
      ),
      render2: () => (
        <div className="mob-inv-field">
          <label className="mob-inv-label">Footer Message</label>
          <textarea className="mob-inv-textarea" rows="2" value={invoiceForm.receiptFooter} onChange={e => setInvoiceForm({ ...invoiceForm, receiptFooter: e.target.value })} placeholder="Thank you for your business!" />
        </div>
      ),
    },
    {
      key: 'printer', icon: BiPrinter, title: 'Printer',
      render: () => (
        <>
          <div className="mob-inv-field">
            <label className="mob-inv-label">Paper Size</label>
            <div className="mob-inv-chip-group">
              {PAPER_SIZES.map(ps => (
                <button key={ps.value} type="button" className={`mob-inv-chip ${printForm.paperSize === ps.value ? 'active' : ''}`} onClick={() => setPrintForm({ ...printForm, paperSize: ps.value })}>{ps.icon} {ps.label}</button>
              ))}
            </div>
          </div>
          <div className="mob-inv-field">
            <label className="mob-inv-label">Invoice Design</label>
            <div className="mob-inv-chip-group">
              {INVOICE_TEMPLATES.map(tpl => (
                <button key={tpl.value} type="button" className={`mob-inv-chip ${printForm.invoiceTemplate === tpl.value ? 'active' : ''}`} onClick={() => setPrintForm({ ...printForm, invoiceTemplate: tpl.value })}>{tpl.icon} {tpl.label}</button>
              ))}
            </div>
          </div>
          <div className="mob-inv-field">
            <label className="mob-inv-label">Print Mode</label>
            <div className="mob-inv-chip-group">
              {PRINT_MODES.map(mode => (
                <button key={mode.value} type="button" className={`mob-inv-chip ${printForm.printMode === mode.value ? 'active' : ''}`} onClick={() => setPrintForm({ ...printForm, printMode: mode.value })}>{mode.label}</button>
              ))}
            </div>
          </div>
          <div className="mob-inv-row-2col">
            <div className="mob-inv-field">
              <label className="mob-inv-label">Auto Print</label>
              <label className="mob-inv-switch">
                <input type="checkbox" checked={printForm.autoPrint} onChange={e => setPrintForm({ ...printForm, autoPrint: e.target.checked })} />
                <span className="mob-inv-switch-slider" />
              </label>
            </div>
            <div className="mob-inv-field">
              <label className="mob-inv-label">Print Copies</label>
              <input type="number" className="mob-inv-input" min="1" max="10" value={printForm.printCopies} onChange={e => setPrintForm({ ...printForm, printCopies: Math.max(1, Number(e.target.value)) })} />
            </div>
          </div>
        </>
      ),
    },
    {
      key: 'margins', icon: BiExpandVertical, title: 'Margins',
      render: () => (
        <div className="mob-inv-margin-grid">
          <div className="mob-inv-field"><label className="mob-inv-label">Top</label><input type="number" className="mob-inv-input" min="0" max="50" value={printForm.marginTop} onChange={e => setPrintForm({ ...printForm, marginTop: Number(e.target.value) })} /></div>
          <div className="mob-inv-field"><label className="mob-inv-label">Bottom</label><input type="number" className="mob-inv-input" min="0" max="50" value={printForm.marginBottom} onChange={e => setPrintForm({ ...printForm, marginBottom: Number(e.target.value) })} /></div>
          <div className="mob-inv-field"><label className="mob-inv-label">Left</label><input type="number" className="mob-inv-input" min="0" max="50" value={printForm.marginLeft} onChange={e => setPrintForm({ ...printForm, marginLeft: Number(e.target.value) })} /></div>
          <div className="mob-inv-field"><label className="mob-inv-label">Right</label><input type="number" className="mob-inv-input" min="0" max="50" value={printForm.marginRight} onChange={e => setPrintForm({ ...printForm, marginRight: Number(e.target.value) })} /></div>
        </div>
      ),
    },
    {
      key: 'visibility', icon: BiBookContent, title: 'Visibility',
      render: () => (
        <div className="mob-inv-vis-grid">
          {[
            { key: 'showLogo', label: 'Logo', icon: BiImage },
            { key: 'showQR', label: 'QR Code', icon: BiQr },
            { key: 'showBarcode', label: 'Barcode', icon: BiCode },
            { key: 'showHeader', label: 'Header', icon: BiLayout },
            { key: 'showFooter', label: 'Footer', icon: BiBookContent },
          ].map(item => (
            <div key={item.key} className="mob-inv-vis-card">
              <div className="mob-inv-vis-left"><item.icon size={18} /><span>{item.label}</span></div>
              <label className="mob-inv-switch">
                <input type="checkbox" checked={printForm[item.key]} onChange={e => setPrintForm({ ...printForm, [item.key]: e.target.checked })} />
                <span className="mob-inv-switch-slider" />
              </label>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const renderMobileInvoiceSection = () => (
    <div className="mob-inv-container">
      {INVOICE_SUB_SECTIONS.map(sub => {
        const isOpen = mobileInvoiceSub === sub.key;
        return (
          <div key={sub.key} className={`mob-inv-accordion ${isOpen ? 'open' : ''}`}>
            <button type="button" className="mob-inv-accordion-header" onClick={() => setMobileInvoiceSub(isOpen ? null : sub.key)}>
              <span className="mob-inv-accordion-header-left"><sub.icon size={18} /><span>{sub.title}</span></span>
              <BiChevronDown size={20} className="mob-inv-accordion-chevron" />
            </button>
            {isOpen && <div className="mob-inv-accordion-body">{sub.render()}{sub.render2 && sub.render2()}</div>}
          </div>
        );
      })}
    </div>
  );

  const renderSection = (key) => {
    switch (key) {
      case 'shop':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiStore} title={t('settingsPage.shopInformation')} description={t('settingsPage.shopInfoDesc')} />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3"><label className="form-label">{t('auth.shopName')}</label><input className="form-control" value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label"><BiEnvelope style={{ marginRight: 4 }} /> {t('auth.email')}</label><input type="email" className="form-control" value={shopForm.email} onChange={e => setShopForm({ ...shopForm, email: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label"><BiPhone style={{ marginRight: 4 }} /> {t('auth.phone')}</label><input className="form-control" value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label"><BiImage style={{ marginRight: 4 }} /> {t('settingsPage.logoUrl')}</label><input className="form-control" value={shopForm.logo} onChange={e => setShopForm({ ...shopForm, logo: e.target.value })} placeholder={t('settingsPage.urlPlaceholder')} /></div>
              </div>
              {shopForm.logo && <div className="mb-3"><img src={shopForm.logo} alt={t('settingsPage.shopLogoPreview')} style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }} /></div>}
              <hr style={{ borderColor: 'var(--border-color)' }} />
              <label className="form-label">{t('settingsPage.address')}</label>
              <div className="settings-field-row">
                <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.street')} value={shopForm.address.street} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, street: e.target.value } })} /></div>
                <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.city')} value={shopForm.address.city} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, city: e.target.value } })} /></div>
                <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.state')} value={shopForm.address.state} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, state: e.target.value } })} /></div>
                <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.zipCode')} value={shopForm.address.zipCode} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, zipCode: e.target.value } })} /></div>
                <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.country')} value={shopForm.address.country} onChange={e => setShopForm({ ...shopForm, address: { ...shopForm.address, country: e.target.value } })} /></div>
              </div>
            </div>
          </div>
        );

      case 'business':
        return (
          <>
            <div className="settings-card">
              <SectionHeader icon={BiBriefcase} title={t('settingsPage.businessType')} description={t('settingsPage.businessTypeDesc')} />
              <div className="p-4">
                {businessTypeLocked && <div className="d-flex align-items-start gap-2" style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--glow-danger)', color: 'var(--danger)', fontWeight: 500, fontSize: '0.8rem', marginBottom: '0.85rem' }}><BiLockAlt style={{ flexShrink: 0, marginTop: '2px' }} /> {t('settingsPage.businessTypeLocked')}</div>}
                <div className="mb-3">
                  <label className="form-label">{t('manageShopsPage.businessType')}</label>
                  <select className="form-select" style={{ maxWidth: '360px' }} value={businessTypeSelect} onChange={(e) => setBusinessTypeSelect(e.target.value)} disabled={businessTypeLocked}>
                    {BUSINESS_TYPE_KEYS.map((key) => <option key={key} value={key}>{t(BUSINESS_TYPES[key].i18nKey)}</option>)}
                  </select>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn-premium btn-premium-primary" onClick={handleSaveBusinessType} disabled={saving || businessTypeLocked}><BiSave /> {t('settingsPage.saveBusinessType')}</button>
                  <button type="button" className="btn-premium btn-premium-secondary" onClick={handleApplyRecommendedModules} disabled={saving}><BiRefresh /> {t('settingsPage.applyRecommendedModules')}</button>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginTop: '0.5rem' }}>{t('settingsPage.applyRecommendedModulesHint')}</small>
              </div>
            </div>
            <div className="settings-card mt-3">
              <SectionHeader icon={BiCheck} title={t('settingsPage.optionalModules')} description={t('settingsPage.optionalModulesDesc')} />
              <div className="p-4">
                <div className="d-flex flex-wrap gap-3">
                  {MODULE_KEYS.map((key) => (
                    <label key={key} className="printer-settings-checkbox">
                      <input type="checkbox" checked={!!enabledModules[key]} disabled={savingModuleKey === key} onChange={() => handleToggleModule(key)} />
                      <span>{t(`settingsPage.module.${key}`)}</span>
                    </label>
                  ))}
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginTop: '0.75rem' }}>{t('settingsPage.optionalModulesHint')}</small>
              </div>
            </div>
            <div className="settings-card mt-3">
              <SectionHeader icon={BiGridSmall} title={t('settingsPage.unitManager')} description={t('settingsPage.unitManagerDesc')} />
              <div className="p-4">
                <div className="mb-2" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('settingsPage.defaultUnits')}</div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {GLOBAL_UNITS.map((u) => <span key={u.key} className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: 600 }}>{t(u.i18nKey)}</span>)}
                </div>
                {customUnits.length > 0 && (
                  <>
                    <div className="mb-2" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('settingsPage.customUnits')}</div>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {customUnits.map((u) => (
                        <span key={u.key} className="badge d-flex align-items-center gap-1" style={{ background: 'var(--glow-primary)', color: 'var(--primary)', fontWeight: 600 }}>
                          {u.label}
                          <button type="button" onClick={() => handleDeleteUnit(u.key)} style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', padding: 0, cursor: 'pointer' }} title={t('common.delete')}><BiX size={14} /></button>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <hr style={{ borderColor: 'var(--border-color)' }} />
                <label className="form-label">{t('settingsPage.addCustomUnit')}</label>
                <div className="settings-field-row">
                  <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.unitNamePlaceholder')} value={newUnit.label} onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })} /></div>
                  <div className="mb-3"><input className="form-control" placeholder={t('settingsPage.unitNameBnPlaceholder')} value={newUnit.labelBn} onChange={(e) => setNewUnit({ ...newUnit, labelBn: e.target.value })} /></div>
                </div>
                <button type="button" className="btn-premium btn-premium-primary" onClick={handleAddUnit} disabled={saving}><BiPlus /> {t('settingsPage.addUnit')}</button>
              </div>
            </div>
          </>
        );

      case 'gst':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiTag} title="GST Settings" description="Configure GST settings — business state, GST number, default rates, and round-off preferences" />
            <div className="p-4">
              <div className="mb-3">
                <label className="printer-settings-checkbox">
                  <input type="checkbox" checked={gstForm.gstEnabled} onChange={e => setGstForm({ ...gstForm, gstEnabled: e.target.checked })} />
                  <span>Enable GST</span>
                </label>
              </div>
              {gstForm.gstEnabled && (
                <>
                  <div className="mb-3">
                    <label className="form-label">GST Number</label>
                    <input className="form-control" style={{ maxWidth: '300px' }} value={gstForm.gstNumber} onChange={e => setGstForm({ ...gstForm, gstNumber: e.target.value })} placeholder="e.g. 22AAAAA0000A1Z5" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Business State</label>
                    <select className="form-select" style={{ maxWidth: '300px' }} value={gstForm.businessState} onChange={e => setGstForm({ ...gstForm, businessState: e.target.value })}>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Default GST Rate (%)</label>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <input type="number" className="form-control" style={{ maxWidth: '120px' }} value={gstForm.defaultGstRate} onChange={e => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value)));
                        setGstForm({ ...gstForm, defaultGstRate: val, cgstRate: val / 2, sgstRate: val / 2, igstRate: val });
                      }} min="0" max="100" step="0.5" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                      <div className="d-flex gap-1 ms-2 flex-wrap">
                        {[0, 5, 12, 18, 28].map(val => (
                          <button key={val} type="button" className={`btn-premium btn-premium-sm ${gstForm.defaultGstRate === val ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setGstForm({ ...gstForm, defaultGstRate: val, cgstRate: val / 2, sgstRate: val / 2, igstRate: val })}>
                            {val === 0 ? 'Nil' : `${val}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>Choose from standard GST rates: 0% (Nil), 5%, 12%, 18%, 28%</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">CGST Rate (%)</label>
                    <input type="number" className="form-control" style={{ maxWidth: '120px' }} value={gstForm.cgstRate} onChange={e => setGstForm({ ...gstForm, cgstRate: Math.max(0, Math.min(100, Number(e.target.value))) })} min="0" max="100" step="0.5" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">SGST Rate (%)</label>
                    <input type="number" className="form-control" style={{ maxWidth: '120px' }} value={gstForm.sgstRate} onChange={e => setGstForm({ ...gstForm, sgstRate: Math.max(0, Math.min(100, Number(e.target.value))) })} min="0" max="100" step="0.5" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">IGST Rate (%)</label>
                    <input type="number" className="form-control" style={{ maxWidth: '120px' }} value={gstForm.igstRate} onChange={e => setGstForm({ ...gstForm, igstRate: Math.max(0, Math.min(100, Number(e.target.value))) })} min="0" max="100" step="0.5" />
                  </div>
                  <div className="mb-3">
                    <label className="printer-settings-checkbox">
                      <input type="checkbox" checked={gstForm.roundOffEnabled} onChange={e => setGstForm({ ...gstForm, roundOffEnabled: e.target.checked })} />
                      <span>Enable Round Off</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'invoice':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiReceipt} title={t('settings.invoiceSettings')} description="Configure invoice prefix, receipt footer, paper size, design, and print preferences" />
            <div className="p-4">
              <h6 className="fw-semibold mb-3" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Settings</h6>
              <div className="mb-3">
                <label className="form-label">{t('settingsPage.invoiceNumberPrefix')}</label>
                <input className="form-control" style={{ maxWidth: '220px' }} value={invoiceForm.invoicePrefix} onChange={e => setInvoiceForm({ ...invoiceForm, invoicePrefix: e.target.value })} placeholder={t('settingsPage.invoicePrefixPlaceholder')} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('settingsPage.invoiceFooterMessage')}</label>
                <textarea className="form-control" rows="3" value={invoiceForm.receiptFooter} onChange={e => setInvoiceForm({ ...invoiceForm, receiptFooter: e.target.value })} placeholder={t('settingsPage.invoiceFooterPlaceholder')} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>{t('settingsPage.invoiceFooterHint')}</small>
              </div>
              <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />
              <h6 className="fw-semibold mb-3" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Print Settings</h6>
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">Paper Size</label>
                <div className="d-flex gap-2 flex-wrap">
                  {PAPER_SIZES.map(ps => (
                    <button key={ps.value} type="button" className={`btn-premium btn-premium-sm d-flex align-items-center gap-1 ${printForm.paperSize === ps.value ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setPrintForm({ ...printForm, paperSize: ps.value })}>{ps.icon} {ps.label}</button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">Invoice / Receipt Design</label>
                <div className="d-flex gap-2 flex-wrap">
                  {INVOICE_TEMPLATES.map(tpl => (
                    <button key={tpl.value} type="button" className={`btn-premium btn-premium-sm d-flex align-items-center gap-1 ${printForm.invoiceTemplate === tpl.value ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setPrintForm({ ...printForm, invoiceTemplate: tpl.value })}>{tpl.icon} {tpl.label}</button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">Print Mode</label>
                <div className="d-flex gap-2 flex-wrap">
                  {PRINT_MODES.map(mode => (
                    <button key={mode.value} type="button" className={`btn-premium btn-premium-sm ${printForm.printMode === mode.value ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setPrintForm({ ...printForm, printMode: mode.value })}>{mode.label}</button>
                  ))}
                </div>
              </div>
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <label className="printer-settings-checkbox"><input type="checkbox" checked={printForm.autoPrint} onChange={e => setPrintForm({ ...printForm, autoPrint: e.target.checked })} /><span>Auto Print</span></label>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginTop: 2 }}>Automatically open print dialog after sale</small>
                </div>
                <div className="col-6">
                  <label className="form-label">Print Copies</label>
                  <input type="number" className="form-control" style={{ maxWidth: '100px' }} min="1" max="10" value={printForm.printCopies} onChange={e => setPrintForm({ ...printForm, printCopies: Math.max(1, Number(e.target.value)) })} />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">Margins (mm)</label>
                <div className="row g-2">
                  {['Top', 'Bottom', 'Left', 'Right'].map((dir, idx) => {
                    const key = `margin${dir}`;
                    return (
                      <div key={dir} className="col-3">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>{dir}</label>
                        <input type="number" className="form-control" min="0" max="50" value={printForm[key]} onChange={e => setPrintForm({ ...printForm, [key]: Number(e.target.value) })} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold mb-2">Visibility Options</label>
                <div className="d-flex flex-wrap gap-3">
                  {[{ key: 'showLogo', label: 'Logo', icon: BiImage }, { key: 'showQR', label: 'QR Code', icon: BiCheck }, { key: 'showBarcode', label: 'Barcode', icon: BiBarcode }, { key: 'showHeader', label: 'Header', icon: BiImage }, { key: 'showFooter', label: 'Footer', icon: BiNote }].map(item => (
                    <label key={item.key} className="printer-settings-checkbox">
                      <input type="checkbox" checked={printForm[item.key]} onChange={e => setPrintForm({ ...printForm, [item.key]: e.target.checked })} />
                      <span><item.icon size={14} style={{ marginRight: 3 }} /> Show {item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}><BiCopyright size={12} style={{ marginRight: 2 }} /> These settings apply globally to all print actions (POS, Sales, Invoice Preview, Reprint).</small>
            </div>
          </div>
        );

      case 'barcode':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiBarcode} title={t('settingsPage.barcodeSettings')} description={t('settingsPage.barcodeSectionDesc')} />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3">
                  <label className="form-label">{t('settingsPage.barcodeFormat')}</label>
                  <select className="form-select" value={barcodeForm.barcodeSymbology} onChange={e => setBarcodeForm({ ...barcodeForm, barcodeSymbology: e.target.value })}>
                    {BARCODE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('settingsPage.barcodePrefix')}</label>
                  <input className="form-control" value={barcodeForm.barcodePrefix} onChange={e => setBarcodeForm({ ...barcodeForm, barcodePrefix: e.target.value })} placeholder={t('settingsPage.barcodePrefixPlaceholder')} />
                </div>
              </div>
              <div className="mb-2">
                <label className="printer-settings-checkbox">
                  <input type="checkbox" checked={barcodeForm.autoGenerateBarcode} onChange={e => setBarcodeForm({ ...barcodeForm, autoGenerateBarcode: e.target.checked })} />
                  <span>{t('settingsPage.autoGenerateBarcodes')}</span>
                </label>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>{t('settingsPage.barcodeHint')}</small>
            </div>
          </div>
        );

      case 'pos':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiGridSmall} title={t('settingsPage.posDisplaySettings')} description={t('settingsPage.posDisplaySettingsDesc')} />
            <div className="p-4">
              <div className="mb-4">
                <label className="form-label">{t('settingsPage.posDesktopProductsPerCategory')}</label>
                <div className="d-flex gap-2 flex-wrap">
                  {[5, 10, 15, 20, 25, 30].map(val => (
                    <button key={val} type="button" className={`btn-premium btn-premium-sm ${posDisplayForm.desktop === val ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setPosDisplayForm({ ...posDisplayForm, desktop: val })}>{val}</button>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label">{t('settingsPage.posMobileProductsPerCategory')}</label>
                <div className="d-flex gap-2 flex-wrap">
                  {[5, 10, 15, 20].map(val => (
                    <button key={val} type="button" className={`btn-premium btn-premium-sm ${posDisplayForm.mobile === val ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setPosDisplayForm({ ...posDisplayForm, mobile: val })}>{val}</button>
                  ))}
                </div>
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>{t('settingsPage.posDisplaySettingsHint')}</small>
            </div>
          </div>
        );

      case 'backup':
        return (
          <>
            <div className="settings-card mb-4">
              <SectionHeader icon={BiCloudDownload} title={t('settingsPage.downloadBackup')} description={t('settingsPage.downloadBackupDesc')} />
              <div className="p-4">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('settingsPage.downloadBackupBody')}</p>
                <button type="button" className="btn-premium btn-premium-primary" onClick={handleDownloadBackup} disabled={downloadingBackup}>
                  {downloadingBackup ? <><span className="spinner-border spinner-border-sm" /> {t('settingsPage.preparing')}</> : <><BiCloudDownload /> {t('settingsPage.downloadBackup')}</>}
                </button>
              </div>
            </div>
            <div className="settings-card">
              <SectionHeader icon={BiCloudUpload} title={t('settingsPage.restoreFromBackup')} description={t('settingsPage.restoreDesc')} />
              <div className="p-4">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('settingsPage.restoreBody')}</p>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="btn-premium btn-premium-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                    <BiCloudUpload /> {t('settingsPage.chooseFile')}
                    <input type="file" accept="application/json" onChange={handleRestoreFileChange} style={{ display: 'none' }} />
                  </label>
                  {restoreFile && <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{restoreFile.name}</span>}
                  <button type="button" className="btn-premium btn-premium-primary" onClick={handleRestore} disabled={!restoreFile || restoring}>
                    {restoring ? <><span className="spinner-border spinner-border-sm" /> {t('settingsPage.restoring')}</> : t('settingsPage.restore')}
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      case 'security':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiShieldQuarter} title={t('settingsPage.security')} description={t('settingsPage.securitySectionDesc')} />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3"><label className="form-label">{t('auth.email')}</label><div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{profileData?.email || '—'}</div></div>
                <div className="mb-3"><label className="form-label">{t('settingsPage.role')}</label><div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{profileData?.role || '—'}</div></div>
                <div className="mb-3"><label className="form-label">{t('settingsPage.lastLogin')}</label><div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{formatDateTime(profileData?.lastLogin)}</div></div>
                <div className="mb-3"><label className="form-label">{t('settingsPage.memberSince')}</label><div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{formatDateTime(profileData?.createdAt)}</div></div>
              </div>
              <hr style={{ borderColor: 'var(--border-color)' }} />
              <label className="form-label">{t('settingsPage.sessions')}</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('settingsPage.signOutHint')}</p>
              <button type="button" className="btn-premium" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleSignOutAllDevices}>{t('settingsPage.signOutAllDevices')}</button>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="settings-card">
            <SectionHeader icon={BiUserCircle} title={t('common.profile')} description={t('settingsPage.profileSectionDesc')} />
            <div className="p-4">
              <div className="settings-field-row">
                <div className="mb-3"><label className="form-label">{t('auth.name')}</label><input className="form-control" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label">{t('auth.phone')}</label><input className="form-control" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label">{t('auth.email')}</label><div className="form-control" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{profileData?.email || '—'}</div></div>
                <div className="mb-3"><label className="form-label"><BiImage style={{ marginRight: 4 }} /> {t('settingsPage.avatarUrl')}</label><input className="form-control" value={profileForm.avatar} onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder={t('settingsPage.urlPlaceholder')} /></div>
              </div>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="settings-card" style={{ maxWidth: '520px' }}>
            <SectionHeader icon={BiLockAlt} title={t('settingsPage.changePassword')} description={t('settingsPage.changePasswordDesc')} />
            <div style={{ padding: '20px 24px 16px' }}>
              {[{ key: 'current', label: t('settingsPage.currentPassword'), field: 'currentPassword', autoComplete: 'current-password' }, { key: 'new', label: t('auth.newPassword'), field: 'newPassword', autoComplete: 'new-password' }, { key: 'confirm', label: t('auth.confirmNewPassword'), field: 'confirmPassword', autoComplete: 'new-password' }].map(({ key, label, field, autoComplete }) => (
                <div key={key} style={{ marginBottom: key === 'confirm' ? '12px' : '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }} className="password-input-wrapper">
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, flexShrink: 0, color: 'var(--text-muted)', fontSize: '1.05rem' }}><BiLockAlt /></span>
                    <input type={showPassword[key] ? 'text' : 'password'} value={passwordForm[field]} onChange={e => setPasswordForm({ ...passwordForm, [field]: e.target.value })} autoComplete={autoComplete} placeholder={key === 'current' ? t('settingsPage.enterCurrentPassword') : key === 'new' ? t('settingsPage.enterNewPassword') : t('settingsPage.confirmNewPasswordPlaceholder')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'var(--font-family)', padding: '10px 0', minHeight: 42 }} />
                    <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, [key]: !prev[key] }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '1.15rem', cursor: 'pointer', padding: 0, transition: 'color 200ms' }} tabIndex={-1}>{showPassword[key] ? <BiHide /> : <BiShow />}</button>
                  </div>
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

  if (loading) return <SettingsSkeletonLoader />;

  return (
    <div>
      <div className="mb-4">
        <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.settings')}</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{t('settingsPage.pageDescription')}</p>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          {SECTIONS.map(section => (
            <button key={section.key} type="button" className={`settings-nav-item ${activeSection === section.key ? 'active' : ''}`} onClick={() => setActiveSection(section.key)}>
              <section.icon /> <span>{section.label}</span>
            </button>
          ))}
        </aside>

        <div className="settings-content">
          {renderSection(activeSection)}
          {saveAction && (
            <div className="settings-save-bar">
              <span className="settings-save-hint">{t('settingsPage.saveHint', { label: saveAction.label })}</span>
              <button type="button" className="btn-premium btn-premium-primary" onClick={saveAction.onSave} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiSave /> {saveAction.label}</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="settings-accordion">
        {SECTIONS.map(section => {
          const isOpen = mobileExpanded === section.key;
          const sectionSaveAction = SAVE_ACTIONS[section.key];
          return (
            <div key={section.key} className={`settings-accordion-item ${isOpen ? 'open' : ''}`}>
              <button type="button" className="settings-accordion-header" onClick={() => { setMobileExpanded(isOpen ? null : section.key); if (section.key !== 'invoice') setMobileInvoiceSub(null); }}>
                <span className="settings-accordion-header-left"><section.icon /> {section.label}</span>
                <BiChevronDown className="settings-accordion-chevron" />
              </button>
              {isOpen && (
                <div className="settings-accordion-body">
                  {section.key === 'invoice' ? (
                    <>
                      {renderMobileInvoiceSection()}
                      <div className="settings-accordion-save">
                        <button type="button" className="btn-premium btn-premium-primary" onClick={handleSavePrint} disabled={saving}>
                          {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiSave /> Save Print Settings</>}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {renderSection(section.key)}
                      {sectionSaveAction && (
                        <div className="settings-accordion-save">
                          <button type="button" className="btn-premium btn-premium-primary" onClick={sectionSaveAction.onSave} disabled={saving}>
                            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiSave /> {sectionSaveAction.label}</>}
                          </button>
                        </div>
                      )}
                    </>
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