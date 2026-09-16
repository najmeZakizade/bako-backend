// src/components/common/Sidebar.jsx
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    initializeNotificationStore,
    subscribeToNotificationCount,
} from '../../utils/notificationStore';

/* ============================================================
   🎯 کلید localStorage — per-tenant (هماهنگ با CounterOrder)
   ============================================================ */
const getTenantId = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.tenantId || user.bakeryId || null;
        }
    } catch (e) {
        console.error('خطا در دریافت tenantId:', e);
    }
    return null;
};

const getCartKey = () => {
    const tid = getTenantId();
    return tid ? `bako_counter_cart_${tid}` : 'bako_counter_cart_guest';
};

function Sidebar({ isOpen, toggleSidebar }) {
    const [notifCount, setNotifCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);

    /* ============================================================
       اتصال به Store اعلان‌ها + خواندن سبد حضوری
       ============================================================ */
    useEffect(() => {
        initializeNotificationStore();
        const unsubscribe = subscribeToNotificationCount((c) =>
            setNotifCount(c)
        );

        // خواندن تعداد سبد حضوری از localStorage
        const refreshCart = () => {
            try {
                const saved = localStorage.getItem(getCartKey());
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        const total = parsed.reduce(
                            (sum, item) => sum + (item.quantity || 0),
                            0
                        );
                        setCartCount(total);
                        return;
                    }
                }
                setCartCount(0);
            } catch (e) {
                setCartCount(0);
            }
        };

        refreshCart();
        const handleCartUpdate = () => refreshCart();
        window.addEventListener('cartUpdated', handleCartUpdate);
        window.addEventListener('storage', handleCartUpdate);

        return () => {
            unsubscribe();
            window.removeEventListener('cartUpdated', handleCartUpdate);
            window.removeEventListener('storage', handleCartUpdate);
        };
    }, []);

    /* ============================================================
       آیتم‌های منو
       ============================================================ */
    const menuItems = [
        { path: '/bakery/dashboard', label: 'داشبورد', icon: '/images/sidebar/dashboard-icon.png' },
        { path: '/bakery/orders', label: 'سفارش‌ها', icon: '/images/sidebar/orders-icon.png' },
        { path: '/bakery/notifications', label: 'اعلان‌ها', icon: '/images/sidebar/orders-icon.png', showNotifBadge: true },
        { path: '/bakery/inventory', label: 'موجودی', icon: '/images/sidebar/inventory-icon.png' },
        { path: '/bakery/products', label: 'محصولات', icon: '/images/sidebar/products-icon.png' },
        { path: '/bakery/counter', label: 'ثبت حضوری', icon: '/images/sidebar/counter-icon.png', showCartBadge: true },
        { path: '/bakery/reports', label: 'گزارش‌ها', icon: '/images/sidebar/reports-icon.png' },
        { path: '/bakery/staff', label: 'پرسنل', icon: '/images/sidebar/staff-icon.png' },
        { path: '/bakery/couriers', label: 'پیک‌ها', icon: '/images/sidebar/courier-icon.png' },
        { path: '/bakery/courier-tariff', label: 'تعرفه پیک', icon: '/images/sidebar/tariff-icon.png' },
    ];

    return (
        <div className={`bakery-sidebar ${isOpen ? 'open' : 'closed'}`}>
            {menuItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                >
                    <img src={item.icon} alt={item.label} className="sidebar-icon" />
                    <span className="sidebar-text">{item.label}</span>

                    {/* 🔔 بج اعلان‌ها */}
                    {item.showNotifBadge && notifCount > 0 && (
                        <span className="bakery-sidebar-badge notification-badge">
                            {notifCount}
                        </span>
                    )}

                    {/* 🛒 بج سبد خرید حضوری */}
                    {item.showCartBadge && cartCount > 0 && (
                        <span className="bakery-sidebar-badge">
                            {cartCount}
                        </span>
                    )}
                </NavLink>
            ))}
        </div>
    );
}

export default Sidebar;