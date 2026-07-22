import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BiGridAlt,
  BiStore,
  BiCategory,
  BiBookBookmark,
  BiCreditCard,
  BiDollar,
  BiBarChartAlt,
  BiCog,
  BiCloudUpload,
  BiHistory,
  BiUserCircle,
  BiKey,
  BiChevronDown,
  BiChevronRight,
  BiX,
} from 'react-icons/bi';

const NAV_DATA = [
  {
    id: 'dashboard',
    titleKey: 'nav.dashboard',
    icon: BiGridAlt,
    path: '/super-admin',
    end: true,
    isSingle: true,
  },
  {
    id: 'business',
    titleKey: 'nav.businessManagement',
    icon: BiStore,
    items: [
      { path: '/super-admin/shops', icon: BiStore, labelKey: 'nav.shops' },
      { path: '/super-admin/business-types', icon: BiCategory, labelKey: 'nav.businessTypes' },
      { path: '/super-admin/categories-library', icon: BiBookBookmark, labelKey: 'nav.categoriesLibrary' },
    ],
  },
  {
    id: 'subscription',
    titleKey: 'nav.subscription',
    icon: BiCreditCard,
    items: [
      { path: '/super-admin/plans', icon: BiCreditCard, labelKey: 'nav.plans' },
      { path: '/super-admin/active-subscriptions', icon: BiDollar, labelKey: 'nav.activeSubscriptions' },
      { path: '/super-admin/payments', icon: BiDollar, labelKey: 'nav.payments' },
    ],
  },
  {
    id: 'reports',
    titleKey: 'nav.reports',
    icon: BiBarChartAlt,
    items: [
      { path: '/super-admin/revenue-reports', icon: BiBarChartAlt, labelKey: 'nav.revenueReports' },
      { path: '/super-admin/business-reports', icon: BiStore, labelKey: 'nav.businessReports' },
    ],
  },
  {
    id: 'system',
    titleKey: 'nav.system',
    icon: BiCog,
    items: [
      { path: '/super-admin/global-settings', icon: BiCog, labelKey: 'nav.globalSettings' },
      { path: '/super-admin/backup-restore', icon: BiCloudUpload, labelKey: 'nav.backupRestore' },
    ],
  },
  {
    id: 'security',
    titleKey: 'nav.security',
    icon: BiHistory,
    items: [
      { path: '/super-admin/activity-logs', icon: BiHistory, labelKey: 'nav.activityLogs' },
    ],
  },
  {
    id: 'profile',
    titleKey: 'nav.profile',
    icon: BiUserCircle,
    items: [
      { path: '/super-admin/my-profile', icon: BiUserCircle, labelKey: 'nav.myProfile' },
      { path: '/super-admin/change-password', icon: BiKey, labelKey: 'nav.changePassword' },
    ],
  },
];

const SuperAdminSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [expandedGroup, setExpandedGroup] = useState(null);

  useEffect(() => {
    const currentPath = location.pathname;
    for (const section of NAV_DATA) {
      if (section.isSingle) {
        if (section.end && currentPath === section.path) return;
        if (!section.end && currentPath.startsWith(section.path)) return;
      } else {
        const match = section.items?.some(
          (item) => currentPath === item.path || currentPath.startsWith(item.path + '/')
        );
        if (match) {
          setExpandedGroup(section.id);
          return;
        }
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (groupId) => {
    if (collapsed) return;
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  };

  const isAnyChildActive = (items) => {
    return items?.some(
      (item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    );
  };

  const renderTooltip = (label) => {
    if (!collapsed) return null;
    return <span className="sa-nav-tooltip">{label}</span>;
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 991.98 && onMobileClose) onMobileClose();
  };

  return (
    <>
      <div
        className={`sa-sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => onMobileClose && onMobileClose()}
      />
      <div className={`sa-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sa-sidebar-logo">
          <div className="sa-logo-icon">SA</div>
          <span className="sa-logo-text">{t('nav.superAdmin')}</span>
          {mobileOpen && (
            <button className="sa-close-btn ms-auto" onClick={() => onMobileClose && onMobileClose()}>
              <BiX />
            </button>
          )}
        </div>

        <div className="sa-sidebar-nav">
          {NAV_DATA.map((section) => {
            if (section.isSingle) {
              return (
                <NavLink
                  key={section.id}
                  to={section.path}
                  end={section.end}
                  className={({ isActive }) =>
                    `sa-nav-link sa-nav-link-single ${isActive ? 'active' : ''}`
                  }
                  onClick={handleNavClick}
                >
                  <section.icon className="sa-nav-icon" />
                  <span className="sa-nav-label">{t(section.titleKey)}</span>
                  {renderTooltip(t(section.titleKey))}
                </NavLink>
              );
            }

            const groupActive = isAnyChildActive(section.items);
            const isExpanded = expandedGroup === section.id;
            const Icon = section.icon;

            return (
              <div key={section.id} className="sa-nav-group">
                <button
                  className={`sa-nav-group-btn ${groupActive ? 'group-active' : ''} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleGroup(section.id)}
                >
                  <Icon className="sa-nav-icon" />
                  <span className="sa-nav-label">{t(section.titleKey)}</span>
                  {!collapsed && (
                    <span className="sa-nav-chevron">
                      {isExpanded ? <BiChevronDown /> : <BiChevronRight />}
                    </span>
                  )}
                  {collapsed && renderTooltip(t(section.titleKey))}
                </button>
                <div className={`sa-nav-submenu ${isExpanded ? 'open' : ''}`}>
                  {section.items.map((item) => {
                    const isItemActive =
                      location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`sa-nav-link sa-nav-sub-link ${isItemActive ? 'active' : ''}`}
                        onClick={handleNavClick}
                      >
                        <item.icon className="sa-nav-icon sa-sub-icon" />
                        <span className="sa-nav-label">{t(item.labelKey)}</span>
                        {collapsed && renderTooltip(t(item.labelKey))}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
};

export default SuperAdminSidebar;