// src/components/layout/AdminSidebar.jsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/super-admin.css';

// ============================================================
//  آیتم‌های منوی سایدبار سوپر ادمین
// ============================================================
const MENU_ITEMS = [
    {
        path: '/admin/dashboard',
        label: 'داشبورد',
        icon: '/admin-sidebar-icons/dashboard.png',
        fallback: '📊',
        end: true,
    },
    {
        path: '/admin/users',
        label: 'کاربران',
        icon: '/admin-sidebar-icons/users.png',
        fallback: '👥',
    },
    {
        path: '/admin/tenants',
        label: 'نانوایی‌ها',
        icon: '/admin-sidebar-icons/tenants.png',
        fallback: '🏪',
    },
    {
        path: '/admin/transactions',
        label: 'تراکنش‌ها',
        icon: '/admin-sidebar-icons/transactions.png',
        fallback: '📋',
    },
];

// ============================================================
//  کامپوننت آیکون — تصویر با fallback به ایموجی
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
function AdminSidebar({ isOpen = true, onClose }) {
    return (
        <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
            {/* 🆕 هدر داخل Drawer (فقط موبایل نمایش داده می‌شود) */}
            <div className="admin-sidebar-mobile-header">
                <img
                    src="/bakoLogo.png"
                    alt="بیکو"
                    className="admin-sidebar-logo"
                    onError={(e) => (e.target.style.display = 'none')}
                />
                <button
                    className="admin-sidebar-close"
                    onClick={onClose}
                    aria-label="بستن منو"
                    type="button"
                >
                    ✕
                </button>
            </div>

            <nav>
                {MENU_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            isActive ? 'active' : ''
                        }
                        onClick={() => {
                            // 🆕 در موبایل با کلیک روی لینک، Drawer بسته شود
                            if (onClose && window.innerWidth <= 900) {
                                onClose();
                            }
                        }}
                    >
                        <SidebarIcon
                            src={item.icon}
                            fallback={item.fallback}
                            alt={item.label}
                        />
                        <span className="sidebar-text">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default AdminSidebar;