// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { getSuperAdminDashboardStats } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber } from '../../utils/format';
import '../../styles/super-admin.css';

function StatIcon({ src, fallback, alt }) {
    const [errored, setErrored] = useState(false);
    if (errored) {
        return (
            <span className="admin-stat-icon-fallback" aria-hidden="true" title={alt}>
                {fallback}
            </span>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className="admin-stat-icon-img"
            onError={() => setErrored(true)}
            draggable={false}
        />
    );
}

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [headerIconError, setHeaderIconError] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('🔵 درخواست آمار داشبورد...');

                const res = await getSuperAdminDashboardStats();
                console.log('✅ پاسخ سرور:', res.status, res.data);

                if (res.data) {
                    console.log('📊 مقادیر:');
                    console.log('  - totalTenants:', res.data.totalTenants);
                    console.log('  - activeTenants:', res.data.activeTenants);
                    console.log('  - totalUsers:', res.data.totalUsers);
                    console.log('  - totalOrders:', res.data.totalOrders);
                    console.log('  - totalProducts:', res.data.totalProducts);
                    setStats(res.data);
                } else {
                    console.warn('⚠️ پاسخ سرور خالی بود');
                    setStats({});
                }
            } catch (err) {
                console.error('❌ خطا در دریافت آمار:', err);
                console.error('   Status:', err.response?.status);
                console.error('   Data:', err.response?.data);
                console.error('   URL:', err.config?.url);

                setError(err.response?.data?.error || err.message || 'خطا در دریافت آمار');
                showToast(err.response?.data?.error || 'خطا در دریافت آمار', 'error');
                setStats({});
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    const totalTenants = stats?.totalTenants ?? 0;
    const activeTenants = stats?.activeTenants ?? 0;
    const paymentEnabled = stats?.tenantsWithPayment ?? 0;
    const totalUsers = stats?.totalUsers ?? 0;
    const totalProducts = stats?.totalProducts ?? 0;
    const totalOrders = stats?.totalOrders ?? 0;

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard-header">
                <h1>
                    {!headerIconError ? (
                        <img
                            src="/admin-sidebar-icons/dashboard.png"
                            alt="داشبورد"
                            className="admin-header-icon"
                            onError={() => setHeaderIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">📊</span>
                    )}
                    داشبورد مدیریت
                </h1>
            </div>

            {error && (
                <div style={{
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    fontWeight: '700'
                }}>
                    ❌ {error}
                </div>
            )}

            <div className="admin-stats-grid">
                <div className="admin-stat-card gold">
                    <StatIcon src="/admin-dashboard-icons/tenants.png" fallback="🏪" alt="نانوایی‌ها" />
                    <div className="admin-stat-number">{toPersianNumber(totalTenants)}</div>
                    <div className="admin-stat-label">کل نانوایی‌ها</div>
                </div>

                <div className="admin-stat-card green">
                    <StatIcon src="/admin-dashboard-icons/active-tenants.png" fallback="✅" alt="نانوایی‌های فعال" />
                    <div className="admin-stat-number">{toPersianNumber(activeTenants)}</div>
                    <div className="admin-stat-label">نانوایی‌های فعال</div>
                </div>

                <div className="admin-stat-card blue">
                    <StatIcon src="/admin-dashboard-icons/payment.png" fallback="💳" alt="درگاه پرداخت" />
                    <div className="admin-stat-number">{toPersianNumber(paymentEnabled)}</div>
                    <div className="admin-stat-label">درگاه پرداخت فعال</div>
                </div>

                <div className="admin-stat-card">
                    <StatIcon src="/admin-dashboard-icons/users.png" fallback="👥" alt="کاربران" />
                    <div className="admin-stat-number">{toPersianNumber(totalUsers)}</div>
                    <div className="admin-stat-label">کل کاربران</div>
                </div>

                <div className="admin-stat-card">
                    <StatIcon src="/admin-dashboard-icons/products.png" fallback="🍞" alt="محصولات" />
                    <div className="admin-stat-number">{toPersianNumber(totalProducts)}</div>
                    <div className="admin-stat-label">کل محصولات</div>
                </div>

                <div className="admin-stat-card">
                    <StatIcon src="/admin-dashboard-icons/orders.png" fallback="📦" alt="سفارشات" />
                    <div className="admin-stat-number">{toPersianNumber(totalOrders)}</div>
                    <div className="admin-stat-label">کل سفارشات</div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;