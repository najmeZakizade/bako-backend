// src/pages/PanelSelector.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toast';
import '../styles/panel-selector.css';

function PanelSelector() {
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!token || !user) {
                navigate('/login', { replace: true });
                return;
            }

            if (user.role !== 'SUPER_ADMIN') {
                const roleRedirects = {
                    'CUSTOMER': '/',
                    'BAKERY_OWNER': '/bakery/dashboard',
                    'MONITOR': '/monitoring/dashboard',
                    'STAFF': '/bakery/dashboard',
                };
                navigate(roleRedirects[user.role] || '/', { replace: true });
            }
        } catch (e) {
            console.error('خطا در بررسی کاربر:', e);
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    /* ============================================================
       کارت‌های پنل — بدون gradient (در CSS تنظیم می‌شه)
       ============================================================ */
    const panels = [
        {
            id: 'customer',
            title: 'پنل سفارش مشتری',
            description: 'سفارش نان تازه و پیگیری تحویل',
            image: '/panel-icons/customer.png',
            fallbackIcon: '🛒',
            path: '/',
        },
        {
            id: 'bakery',
            title: 'پنل مدیریت نانوایی',
            description: 'مدیریت سفارشات، محصولات و پرسنل',
            image: '/panel-icons/bakery.png',
            fallbackIcon: '🍞',
            path: '/bakery/dashboard',
        },
        {
            id: 'admin',
            title: 'پنل ادمین',
            description: 'مدیریت سیستم، کاربران و گزارشات کلی',
            image: '/panel-icons/admin.png',
            fallbackIcon: '👑',
            path: '/admin/dashboard',
        },
        {
            id: 'monitoring',
            title: 'پنل مانیتورینگ',
            description: 'پایش لحظه‌ای سفارشات و عملکرد',
            image: '/panel-icons/monitoring.png',
            fallbackIcon: '📊',
            path: '/monitoring/dashboard',
        },
    ];

    const handleSelectPanel = (panel) => {
        showToast(`ورود به ${panel.title}`, 'success');
        setTimeout(() => navigate(panel.path), 250);
    };

    return (
        <div className="panel-selector-page">
            <div className="panel-selector-container">

                <div className="panel-selector-header">
                    <h1 className="panel-selector-title">انتخاب پنل</h1>
                    <p className="panel-selector-hint">
                        لطفاً پنل مورد نظر خود را انتخاب کنید
                    </p>
                </div>

                <div className="panel-selector-grid">
                    {panels.map((panel) => (
                        <button
                            key={panel.id}
                            type="button"
                            className="panel-card"
                            onClick={() => handleSelectPanel(panel)}
                        >
                            <div className="panel-card-icon-wrap">
                                <img
                                    src={panel.image}
                                    alt={panel.title}
                                    className="panel-card-icon-image"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <span
                                    className="panel-card-icon"
                                    style={{ display: 'none' }}
                                >
                                    {panel.fallbackIcon}
                                </span>
                            </div>

                            <div className="panel-card-body">
                                <h3 className="panel-card-title">{panel.title}</h3>
                                <p className="panel-card-desc">{panel.description}</p>
                            </div>
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}

export default PanelSelector;