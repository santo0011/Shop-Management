import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { BiBell, BiCheckDouble, BiX } from 'react-icons/bi';

const NotificationDropdown = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get('/notifications/unread-count', { _skipLoading: true });
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // Silently fail
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications?limit=10', { _skipLoading: true });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Silently fail
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`, {}, { _skipLoading: true });
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Silently fail
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {}, { _skipLoading: true });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      // Silently fail
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'subscription_expiring_today':
      case 'subscription_expiring_3days':
        return '🔴';
      case 'subscription_renewed':
      case 'subscription_activated':
        return '🟢';
      case 'subscription_assigned':
        return '📋';
      case 'subscription_cancelled':
        return '⛔';
      case 'subscription_expired':
        return '❌';
      default:
        return '🔔';
    }
  };

  const formatTime = (date) => {
    try {
      const now = new Date();
      const then = new Date(date);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return then.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div className="dropdown-premium" ref={dropdownRef}>
      <button
        className="header-btn notification-btn"
        onClick={handleToggle}
        aria-label={t('common.notifications')}
      >
        <BiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-menu-premium notification-dropdown">
          <div className="notification-header">
            <h6 className="mb-0">{t('common.notifications')}</h6>
            {unreadCount > 0 && (
              <button
                className="btn btn-sm btn-link text-decoration-none"
                onClick={handleMarkAllAsRead}
              >
                <BiCheckDouble /> {t('common.markAllRead')}
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <BiBell size={32} className="mb-2" />
                <p className="mb-0">{t('empty.noNotifications')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notification._id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="notification-dot" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notification-btn {
          position: relative;
        }
        .notification-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: var(--danger, #dc3545);
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--bg-card, #fff);
        }
        .notification-dropdown {
          width: 360px;
          max-height: 480px;
          display: flex;
          flex-direction: column;
          padding: 0;
        }
        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .notification-list {
          overflow-y: auto;
          max-height: 400px;
        }
        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border-color);
        }
        .notification-item:hover {
          background: var(--bg-hover, rgba(0,0,0,0.03));
        }
        .notification-item.unread {
          background: var(--bg-unread, rgba(67, 97, 238, 0.05));
        }
        .notification-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .notification-content {
          flex: 1;
          min-width: 0;
        }
        .notification-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .notification-message {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .notification-time {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .notification-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary-color, #4361ee);
          flex-shrink: 0;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
};

export default NotificationDropdown;