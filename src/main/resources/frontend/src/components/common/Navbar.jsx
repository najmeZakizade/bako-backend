// src/components/common/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCartCount, getBakery } from '../../services/api';
import {
    initializeCartStore,
    subscribeToCartCount,
} from '../../utils/cartStore';

// ============================================================
//  اطلاعات پنل‌ها
// ============================================================
const PANELS = {
    BAKERY: { key: 'bakery', label: 'پنل مدیریت نانوایی' },
    ADMIN: { key: 'admin', label: 'پنل مدیریت سیستم' },
    MONITORING: { key: 'monitoring', label: 'پنل نظارت و مانیتورینگ' },
    CUSTOMER: { key: 'customer', label: 'پنل مشتری' },
    PANEL_SELECT: { key: 'panel-select', label: 'انتخاب پنل' },
};

function getCurrentPanel(pathname) {
    if (pathname.startsWith('/bakery')) return PANELS.BAKERY;
    if (pathname.startsWith('/admin')) return PANELS.ADMIN;
    if (pathname.startsWith('/monitoring')) return PANELS.MONITORING;
    if (pathname.startsWith('/panel-select')) return PANELS.PANEL_SELECT;
    return PANELS.CUSTOMER;
}

// ============================================================
//  بج خوش‌آمدگویی (وسط navbar)
//  🆕 اگه bakeryName داشته باشیم، پیام کامل‌تر می‌شه
// ============================================================
function WelcomeBadge({ panel, bakeryName }) {
    if (bakeryName) {
        return (
            <div className="navbar-welcome" aria-live="polite">
                <span className="welcome-message">
                     <strong>{bakeryName}</strong>، به{' '}
                    <strong>{panel.label}</strong> خوش آمدید.
                </span>
            </div>
        );
    }

    return (
        <div className="navbar-welcome" aria-live="polite">
            <span className="welcome-message">
                به <strong>{panel.label}</strong> خوش آمدید.
            </span>
        </div>
    );
}

// ============================================================
//  بج کاربر (آیکون + اسم)
// ============================================================
function UserBadge({ user }) {
    if (!user) return null;
    const displayName = user.fullName || user.username || 'کاربر';
    return (
        <div className="navbar-user" title={displayName}>
            <span className="user-avatar" aria-hidden="true">
                👤
            </span>
            <span className="user-name">{displayName}</span>
        </div>
    );
}

// ============================================================
//  دکمه سبد خرید (آیکون + بج تعداد)
// ============================================================
function CartButton({ count }) {
    return (
        <Link
            to="/cart"
            className="navbar-cart-btn"
            title="سبد خرید"
            aria-label={`سبد خرید${count > 0 ? ` — ${count} آیتم` : ''}`}
        >
            {count > 0 && (
                <span className="cart-count-badge">{count}</span>
            )}
        </Link>
    );
}

// ============================================================
//  کامپوننت اصلی Navbar
// ============================================================
function Navbar() {
    const [cartCount, setCartCount] = useState(0);
    const [bakeryName, setBakeryName] = useState(null);
    const location = useLocation();
    const token = localStorage.getItem('token');

    let user = null;
    try {
        const userStr = localStorage.getItem('user');
        user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error('❌ خطا در parse user در Navbar:', e);
        localStorage.removeItem('user');
    }

    /* ============================================================
       🎯 اتصال به Store مرکزی سبد خرید
       ============================================================ */
    useEffect(() => {
        initializeCartStore();
        const unsubscribe = subscribeToCartCount((newCount) => {
            setCartCount(newCount);
        });
        return unsubscribe;
    }, []);

    /* ============================================================
       🆕 دریافت نام نانوایی — فقط برای BAKERY_OWNER و STAFF
       ============================================================ */
    useEffect(() => {
        // اگه کاربر لاگین نیست → پاک کن
        if (!user) {
            setBakeryName(null);
            localStorage.removeItem('bako_tenant_name');
            return;
        }

        // فقط صاحب نانوایی یا کارمند
        const isBakeryRole =
            user.role === 'BAKERY_OWNER' || user.role === 'STAFF';
        if (!isBakeryRole) {
            setBakeryName(null);
            return;
        }

        // اگه tenantId نداره → نمی‌تونیم بگیریم
        if (!user.tenantId) return;

        const fetchBakeryName = async () => {
            // ۱. اگه قبلاً cached داریم، فوراً نشون بده
            const cached = localStorage.getItem('bako_tenant_name');
            if (cached) {
                setBakeryName(cached);
            }

            // ۲. از API بگیر
            try {
                const res = await getBakery(user.tenantId);
                const tenant = res?.data || null;
                const name = tenant?.displayName || tenant?.name;

                if (name) {
                    setBakeryName(name);
                    localStorage.setItem('bako_tenant_name', name);
                }
            } catch (err) {
                console.warn(
                    '⚠️ خطا در دریافت نام نانوایی:',
                    err.message
                );
                // اگه خطا داد ولی cache داشتیم، همون بمونه
            }
        };

        fetchBakeryName();
    }, [user]);

    // در صفحه لاگین هیچ نوار ناوبری نشون نده
    if (location.pathname === '/login') {
        return null;
    }

    const currentPanel = getCurrentPanel(location.pathname);

    /* ============================================================
       خروج
       ============================================================ */
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('bako_tenant_name'); // 🆕 پاک کن
        window.location.href = '/login';
    };

    /* ============================================================
       رندر
       ============================================================ */
    return (
        <nav className="navbar navbar-simple">
            {/* لوگو */}
            <Link to="/" className="logo">
                <img
                    src="/bakoLogo.png"
                    alt="بیکو"
                    className="logo-image"
                    onError={(e) => {
                        console.error('❌ لوگو لود نشد:', e.target.src);
                        e.target.style.display = 'none';
                    }}
                />
            </Link>

            {/* بج خوش‌آمدگویی */}
            <WelcomeBadge panel={currentPanel} bakeryName={bakeryName} />

            {/* آیکون سبد خرید + بج کاربر + دکمه خروج */}
            {user && (
                <div className="navbar-actions">
                    <CartButton count={cartCount} />
                    <UserBadge user={user} />
                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                        title="خروج از حساب کاربری"
                        type="button"
                        aria-label="خروج از حساب کاربری"
                    />
                </div>
            )}
        </nav>
    );
}

export default Navbar;