// src/pages/NotificationsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '../services/api';
import { showToast } from '../utils/toast';
import { refreshNotificationCount } from '../utils/notificationStore';
import PageTitle from '../components/common/PageTitle';
import '../styles/notifications.css';

// ============================================================
//  چک خوانده‌شده بودن — مقاوم به نام فیلد
// ============================================================
function isRead(notif) {
    if (!notif) return false;
    if (typeof notif.read === 'boolean') return notif.read;
    if (typeof notif.isRead === 'boolean') return notif.isRead;
    if (notif.readAt) return true;
    return false;
}

function NotificationsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await getNotifications();
            setNotifications(res.data || []);
            await refreshNotificationCount();
        } catch (err) {
            console.error('❌ خطا در دریافت اعلان‌ها:', err);
            showToast('خطا در دریافت اعلان‌ها', 'error');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    /* ============================================================
       فرمت تاریخ شمسی
       ============================================================ */
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).formatToParts(date);
            const get = (t) => parts.find((p) => p.type === t)?.value || '';
            return `${get('year')}/${get('month')}/${get('day')} — ${get(
                'hour'
            )}:${get('minute')}`;
        } catch {
            return '';
        }
    };

    /* ============================================================
       🆕 تشخیص پنل فعلی از روی URL
       ============================================================ */
    const getCurrentPanel = () => {
        const path = location.pathname;
        if (path.startsWith('/bakery')) return 'bakery';
        if (path.startsWith('/admin')) return 'admin';
        if (path.startsWith('/monitoring')) return 'monitoring';
        return 'customer';
    };

    /* ============================================================
       کلیک روی اعلان
       ============================================================ */
    const handleNotificationClick = async (notif) => {
        const id = notif._id || notif.id;

        if (!isRead(notif)) {
            try {
                await markNotificationAsRead(id);
                setNotifications((prev) =>
                    prev.map((n) =>
                        (n._id || n.id) === id
                            ? {
                                ...n,
                                read: true,
                                isRead: true,
                                readAt: new Date().toISOString(),
                            }
                            : n
                    )
                );
                await refreshNotificationCount();
            } catch (err) {
                console.warn('⚠️ خطا در علامت‌گذاری:', err);
            }
        }

        if (!notif.orderId) return;

        /* ============================================================
           🆕 ناوبری هوشمند بر اساس پنل فعلی
           ============================================================ */
        const panel = getCurrentPanel();

        if (panel === 'bakery') {
            navigate(`/bakery/counter/receipt/${notif.orderId}`);
        } else if (panel === 'monitoring') {
            navigate(`/monitoring/orders/${notif.orderId}`);
        } else if (panel === 'admin') {
            // پنل ادمین فاکتور نداره — فعلاً به لیست تراکنش‌ها برو
            navigate(`/admin/transactions`);
        } else {
            navigate(`/receipt/${notif.orderId}`);
        }
    };

    /* ============================================================
       علامت‌گذاری همه
       ============================================================ */
    const handleMarkAllAsRead = async () => {
        if (markingAll) return;
        const hasUnread = notifications.some((n) => !isRead(n));
        if (!hasUnread) {
            showToast('همه اعلان‌ها خوانده شده‌اند.', 'error');
            return;
        }

        setMarkingAll(true);
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({
                    ...n,
                    read: true,
                    isRead: true,
                    readAt: n.readAt || new Date().toISOString(),
                }))
            );
            await refreshNotificationCount();
            showToast('همه اعلان‌ها خوانده شدند.', 'success');
        } catch (err) {
            console.error('❌ خطا:', err);
            showToast('خطا در علامت‌گذاری', 'error');
        } finally {
            setMarkingAll(false);
        }
    };

    const unreadCount = notifications.filter((n) => !isRead(n)).length;

    /* ============================================================
       رندر
       ============================================================ */
    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری اعلان‌ها...</p>
            </div>
        );
    }

    return (
        <div className="notifications-page">
            <PageTitle
                image="/sidebar-icons/home.png"
                fallbackIcon="🔔"
                title="اعلان‌ها"
                count={
                    unreadCount > 0
                        ? `${unreadCount} خوانده‌نشده`
                        : 'همه خوانده شده'
                }
            />

            {notifications.length > 0 && unreadCount > 0 && (
                <div className="notifications-toolbar">
                    <button
                        type="button"
                        className="btn-mark-all"
                        onClick={handleMarkAllAsRead}
                        disabled={markingAll}
                    >
                        {markingAll
                            ? '⏳ در حال انجام...'
                            : `✓ همه اعلان‌ها خوانده شد (${unreadCount})`}
                    </button>
                </div>
            )}

            {notifications.length === 0 ? (
                <div className="empty-notifications">
                    <span className="empty-icon">🔕</span>
                    <h2>اعلان جدیدی ندارید</h2>
                    <p>
                        اعلان‌های مربوط به سفارش‌های شما اینجا نمایش داده
                        می‌شوند.
                    </p>
                </div>
            ) : (
                <div className="notifications-list">
                    {notifications.map((notif) => {
                        const id = notif._id || notif.id;
                        const read = isRead(notif);
                        return (
                            <button
                                key={id}
                                type="button"
                                className={`notification-item ${
                                    !read ? 'unread' : ''
                                }`}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <div className="notification-indicator">
                                    {!read && <span className="unread-dot" />}
                                </div>

                                <div className="notification-content">
                                    <h3 className="notification-title">
                                        {notif.title}
                                    </h3>
                                    <p className="notification-message">
                                        {notif.message}
                                    </p>
                                    <span className="notification-date">
                                        {formatDate(notif.createdAt)}
                                    </span>
                                </div>

                                <span className="notification-arrow">›</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default NotificationsPage;