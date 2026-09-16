// src/components/layout/BakeryLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { toPersianNumber } from '../../utils/format';

/* ============================================================
   🎯 کلید localStorage — per-tenant (هماهنگ با CounterOrder/CounterCart)
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

function BakeryLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();

    const [outletKey, setOutletKey] = useState(location.key);
    useEffect(() => {
        setOutletKey(location.key);
    }, [location.key]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // ===== خواندن تعداد سبد خرید از localStorage (per-tenant) =====
    const refreshCart = () => {
        try {
            const saved = localStorage.getItem(getCartKey());
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    const count = parsed.reduce(
                        (sum, item) => sum + (item.quantity || 0),
                        0
                    );
                    setCartCount(count);
                    return;
                }
            }
            setCartCount(0);
        } catch (e) {
            console.error('خطا در خواندن سبد:', e);
            setCartCount(0);
        }
    };

    useEffect(() => {
        refreshCart();

        const handleCartUpdate = () => refreshCart();
        window.addEventListener('cartUpdated', handleCartUpdate);
        window.addEventListener('storage', handleCartUpdate);

        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
            window.removeEventListener('storage', handleCartUpdate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        refreshCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // ============================================================
    //  نقشه عنوان صفحات — کلیدها با مسیر دقیق
    // ============================================================
    const pageTitles = {
        '/bakery/dashboard': { title: 'داشبورد مدیریت', icon: '/images/sidebar/dashboard-icon.png' },
        '/bakery/orders': { title: 'مدیریت سفارش‌ها', icon: '/images/sidebar/orders-icon.png' },
        '/bakery/inventory': { title: 'مدیریت موجودی', icon: '/images/sidebar/inventory-icon.png' },
        '/bakery/products': { title: 'مدیریت محصولات', icon: '/images/sidebar/products-icon.png' },
        '/bakery/counter': { title: 'ثبت سفارش حضوری', icon: '/images/sidebar/counter-icon.png' },
        '/bakery/counter/cart': { title: 'سبد خرید', icon: '/images/sidebar/counter-icon.png' },
        '/bakery/counter/courier': { title: 'انتخاب پیک', icon: '/images/sidebar/courier-icon.png' },
        '/bakery/counter/payment': { title: 'روش پرداخت', icon: '/images/sidebar/counter-icon.png' },
        '/bakery/counter/receipt': { title: 'فاکتور فروش', icon: '/images/sidebar/orders-icon.png' },
        '/bakery/reports': { title: 'گزارش‌های فروش', icon: '/images/sidebar/reports-icon.png' },
        '/bakery/staff': { title: 'مدیریت پرسنل', icon: '/images/sidebar/staff-icon.png' },
        '/bakery/couriers': { title: 'مدیریت پیک‌ها', icon: '/images/sidebar/courier-icon.png' },
        '/bakery/courier-tariff': { title: 'تعرفه پیک', icon: '/images/sidebar/tariff-icon.png' },
    };

    // ============================================================
    //  🎯 پیدا کردن عنوان — با پشتیبانی از مسیرهای داینامیک
    // ============================================================
    const getPageInfo = () => {
        // ۱. تطابق دقیق
        if (pageTitles[location.pathname]) {
            return pageTitles[location.pathname];
        }

        // ۲. تطابق با prefix (برای مسیرهای داینامیک مثل /bakery/orders/:id)
        const sortedPaths = Object.keys(pageTitles).sort(
            (a, b) => b.length - a.length
        );
        for (const path of sortedPaths) {
            if (location.pathname.startsWith(path + '/')) {
                return pageTitles[path];
            }
        }

        // ۳. اگه هیچی پیدا نشد، برگرد به داشبورد
        return pageTitles['/bakery/dashboard'];
    };

    const currentPage = getPageInfo();

    const isCounterHome = location.pathname === '/bakery/counter';

    return (
        <div className="bakery-layout">
            <div className="bakery-body">
                <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                <div className="bakery-content">
                    <div className="bakery-header">
                        <button className="sidebar-toggle" onClick={toggleSidebar}>
                            ☰
                        </button>
                        <div className="page-title">
                            <img
                                src={currentPage.icon}
                                alt={currentPage.title}
                                className="page-title-icon"
                                onError={(e) =>
                                    (e.target.src = '/images/sidebar/default-icon.png')
                                }
                            />
                            <h1>{currentPage.title}</h1>
                        </div>

                        {/* ===== دکمه سبد خرید — فقط در صفحه حضوری ===== */}
                        {isCounterHome && (
                            <button
                                className="header-cart-btn"
                                onClick={() => navigate('/bakery/counter/cart')}
                                title="مشاهده سبد خرید"
                            >
                                <span className="cart-icon">🛒</span>
                                <span className="btn-text">سبد خرید</span>
                                {cartCount > 0 && (
                                    <span className="cart-count-badge">
                                        ({toPersianNumber(cartCount)})
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="page-content">
                        <Outlet key={outletKey} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BakeryLayout;