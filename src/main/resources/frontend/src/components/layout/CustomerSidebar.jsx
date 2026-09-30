// src/components/layout/CustomerSidebar.jsx
import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    initializeCartStore,
    subscribeToCartCount,
} from '../../utils/cartStore';
import {
    initializeNotificationStore,
    subscribeToNotificationCount,
} from '../../utils/notificationStore';
import '../../styles/customer-sidebar.css';

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
    const [open, setOpen] = useState(false);
    const location = useLocation();

    /* ============================================================
       اشتراک در Storeها (سبد و اعلان)
       ============================================================ */
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

    /* ============================================================
       بستن Drawer با تغییر مسیر
       ============================================================ */
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    /* ============================================================
       قفل اسکرول بدنه وقتی Drawer باز است
       ============================================================ */
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const totalBadge = cartCount + notifCount;

    return (
        <>
            {/* 🔘 دکمه باز کردن منو — فقط در موبایل نمایش داده می‌شود */}
            <button
                className="customer-sidebar-toggle"
                onClick={() => setOpen(true)}
                aria-label="باز کردن منو"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 6h18M3 12h18M3 18h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
                {totalBadge > 0 && (
                    <span className="customer-sidebar-toggle-badge">
                        {totalBadge}
                    </span>
                )}
            </button>

            {/* 🌫️ Overlay پشت Drawer — فقط وقتی باز است */}
            {open && (
                <div
                    className="customer-sidebar-overlay"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* 📋 خود سایدبار (در دسکتاپ ثابت، در موبایل Drawer) */}
            <aside className={`customer-sidebar ${open ? 'open' : ''}`}>
                {/* هدر موبایل داخل Drawer */}
                <div className="customer-sidebar-mobile-header">
                    <img
                        src="/bakoLogo.png"
                        alt="بیکو"
                        className="customer-sidebar-logo"
                    />
                    <button
                        className="customer-sidebar-close"
                        onClick={() => setOpen(false)}
                        aria-label="بستن منو"
                    >
                        ✕
                    </button>
                </div>

                <nav className="customer-sidebar-nav">
                    {MENU_ITEMS.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `customer-sidebar-link ${
                                    isActive ? 'active' : ''
                                }`
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
                            {item.showNotificationBadge &&
                                notifCount > 0 && (
                                    <span className="customer-sidebar-badge notification-badge">
                                        {notifCount}
                                    </span>
                                )}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
}

export default CustomerSidebar;