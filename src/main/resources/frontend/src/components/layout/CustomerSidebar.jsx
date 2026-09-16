// src/components/layout/CustomerSidebar.jsx
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    initializeCartStore,
    subscribeToCartCount,
} from '../../utils/cartStore';
import {
    initializeNotificationStore,
    subscribeToNotificationCount,
} from '../../utils/notificationStore';

/* ============================================================
   آیتم‌های منو
   ============================================================ */
const MENU_ITEMS = [
    {
        path: '/',
        label: 'لیست نانوایی‌ها',
        image: '/sidebar-icons/home.png',
        icon: '🏪',
        end: true,
    },
    {
        path: '/cart',
        label: 'سبد خرید',
        image: '/sidebar-icons/cart.png',
        icon: '🛒',
        showCartBadge: true,
    },
    {
        path: '/my-orders',
        label: 'سفارش‌های من',
        image: '/sidebar-icons/my-orders.png',
        icon: '📦',
    },
    {
        path: '/notifications',
        label: 'اعلان‌ها',
        image: '/sidebar-icons/profile.png',
        icon: '🔔',
        showNotificationBadge: true,
    },
    {
        path: '/profile',
        label: 'پروفایل',
        image: '/sidebar-icons/profile.png',
        icon: '👤',
    },
];

function CustomerSidebar() {
    const [cartCount, setCartCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);

    useEffect(() => {
        initializeCartStore();
        const unsubCart = subscribeToCartCount((c) => setCartCount(c));

        initializeNotificationStore();
        const unsubNotif = subscribeToNotificationCount((c) =>
            setNotifCount(c)
        );

        return () => {
            unsubCart();
            unsubNotif();
        };
    }, []);

    return (
        <aside className="customer-sidebar">
            <nav className="customer-sidebar-nav">
                {MENU_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            `customer-sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="customer-sidebar-icon">
                            <img
                                src={item.image}
                                alt={item.label}
                                className="customer-sidebar-icon-image"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display =
                                        'inline-flex';
                                }}
                            />
                            <span
                                className="customer-sidebar-icon-fallback"
                                style={{ display: 'none' }}
                            >
                                {item.icon}
                            </span>
                        </span>

                        <span className="customer-sidebar-text">
                            {item.label}
                        </span>

                        {/* 🛒 بج سبد خرید */}
                        {item.showCartBadge && cartCount > 0 && (
                            <span className="customer-sidebar-badge">
                                {cartCount}
                            </span>
                        )}

                        {/* 🔔 بج اعلان */}
                        {item.showNotificationBadge && notifCount > 0 && (
                            <span className="customer-sidebar-badge notification-badge">
                                {notifCount}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default CustomerSidebar;