// src/components/layout/MonitoringSidebar.jsx
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getMonitoringAlerts } from '../../services/api';
import '../../styles/super-admin.css';
import '../../styles/monitoring.css';

// ============================================================
//  آیتم‌های منوی سایدبار مانیتورینگ
// ============================================================
const MENU_ITEMS = [
    {
        path: '/monitoring/dashboard',
        label: 'داشبورد',
        icon: '/monitoring-sidebar-icons/dashboard.png',
        fallback: '📊',
        end: true,
    },
    {
        path: '/monitoring/alerts',
        label: 'هشدارها',
        icon: '/monitoring-sidebar-icons/alerts.png',
        fallback: '🔔',
        badgeKey: 'total',
    },
    {
        path: '/monitoring/reports',
        label: 'گزارشات',
        icon: '/monitoring-sidebar-icons/reports.png',
        fallback: '📈',
    },
    {
        path: '/monitoring/transactions',
        label: 'تراکنش‌ها',
        icon: '/monitoring-sidebar-icons/transactions.png',
        fallback: '📋',
    },
];

// ============================================================
//  کامپوننت آیکون (تصویر + fallback)
// ============================================================
function SidebarIcon({ src, fallback, alt }) {
    const [errored, setErrored] = useState(false);

    if (errored) {
        return (
            <span
                className="sidebar-icon-emoji"
                aria-hidden="true"
                title={alt}
            >
                {fallback}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className="sidebar-icon-img"
            onError={() => setErrored(true)}
            draggable={false}
        />
    );
}

// ============================================================
//  سایدبار اصلی
// ============================================================
function MonitoringSidebar() {
    const [alertCount, setAlertCount] = useState(0);

    // ============================================================
    //  دریافت تعداد هشدارها (هر ۶۰ ثانیه)
    // ============================================================
    useEffect(() => {
        const fetchAlertCount = async () => {
            try {
                const res = await getMonitoringAlerts();
                const total = res.data?.counts?.total || 0;
                setAlertCount(total);
            } catch (err) {
                console.warn('⚠️ خطا در دریافت تعداد هشدارها:', err.message);
            }
        };

        fetchAlertCount();
        const interval = setInterval(fetchAlertCount, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className="admin-sidebar open">
            <nav>
                {MENU_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            isActive ? 'active' : ''
                        }
                    >
                        <SidebarIcon
                            src={item.icon}
                            fallback={item.fallback}
                            alt={item.label}
                        />
                        <span className="sidebar-text">{item.label}</span>

                        {/* Badge تعداد هشدارها */}
                        {item.badgeKey === 'total' && alertCount > 0 && (
                            <span className="sidebar-badge">
                                {alertCount > 99
                                    ? '۹۹+'
                                    : alertCount.toLocaleString('fa-IR')}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default MonitoringSidebar;