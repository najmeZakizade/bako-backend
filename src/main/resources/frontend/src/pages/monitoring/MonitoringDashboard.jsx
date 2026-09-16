// src/pages/monitoring/MonitoringDashboard.jsx
import { useState, useEffect } from 'react';
import {
    getMonitoringDashboardStats,
    getMonitoringTopTenants,
    getMonitoringAlerts,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import '../../styles/super-admin.css';
import '../../styles/monitoring.css';

// ============================================================
//  آیکون کارت آمار
// ============================================================
function StatIcon({ src, fallback, alt }) {
    const [errored, setErrored] = useState(false);

    if (errored) {
        return (
            <span className="admin-stat-icon-fallback" title={alt}>
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

function MonitoringDashboard() {
    const [stats, setStats] = useState(null);
    const [topTenants, setTopTenants] = useState([]);
    const [alertCounts, setAlertCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [headerIconError, setHeaderIconError] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [statsRes, topRes, alertsRes] =
                    await Promise.allSettled([
                        getMonitoringDashboardStats(),
                        getMonitoringTopTenants(5),
                        getMonitoringAlerts(),
                    ]);

                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
                if (topRes.status === 'fulfilled') setTopTenants(topRes.value.data || []);
                if (alertsRes.status === 'fulfilled') {
                    setAlertCounts(alertsRes.value.data?.counts || {});
                }
            } catch (err) {
                console.error('❌ خطا در دریافت اطلاعات:', err);
                showToast('خطا در دریافت اطلاعات', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    // ===== آمار =====
    const totalTenants = stats?.totalTenants ?? 0;
    const activeTenants = stats?.activeTenants ?? 0;
    const totalProducts = stats?.totalProducts ?? 0;
    const totalOrders = stats?.totalOrders ?? 0;
    const totalRevenue = stats?.totalRevenue ?? 0;
    const ordersLast30Days = stats?.ordersLast30Days ?? 0;

    const pendingOrders = alertCounts?.pendingOrders ?? 0;
    const failedTransactions = alertCounts?.failedTransactions ?? 0;
    const tenantsWithoutPayment = alertCounts?.tenantsWithoutPayment ?? 0;
    const lowStockProducts = alertCounts?.lowStockProducts ?? 0;

    return (
        <div className="admin-dashboard monitoring-dashboard">
            {/* ===== هدر ===== */}
            <div className="admin-dashboard-header">
                <h1>
                    {!headerIconError ? (
                        <img
                            src="/monitoring-sidebar-icons/dashboard.png"
                            alt="داشبورد"
                            className="admin-header-icon"
                            onError={() => setHeaderIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">📊</span>
                    )}
                    داشبورد مانیتورینگ
                </h1>
            </div>

            {/* ===== آمار کلی — ردیف اول ===== */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card gold">
                    <StatIcon src="/admin-dashboard-icons/tenants.png" fallback="🏪" alt="نانوایی‌ها" />
                    <div className="admin-stat-number">{toPersianNumber(totalTenants)}</div>
                    <div className="admin-stat-label">کل نانوایی‌ها</div>
                </div>

                <div className="admin-stat-card green">
                    <StatIcon src="/admin-dashboard-icons/active-tenants.png" fallback="✅" alt="فعال" />
                    <div className="admin-stat-number">{toPersianNumber(activeTenants)}</div>
                    <div className="admin-stat-label">نانوایی‌های فعال</div>
                </div>

                <div className="admin-stat-card">
                    <StatIcon src="/admin-dashboard-icons/products.png" fallback="🍞" alt="محصولات" />
                    <div className="admin-stat-number">{toPersianNumber(totalProducts)}</div>
                    <div className="admin-stat-label">کل محصولات</div>
                </div>
            </div>

            {/* ===== آمار کلی — ردیف دوم ===== */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <StatIcon src="/admin-dashboard-icons/orders.png" fallback="📦" alt="سفارشات" />
                    <div className="admin-stat-number">{toPersianNumber(totalOrders)}</div>
                    <div className="admin-stat-label">کل سفارشات</div>
                </div>

                <div className="admin-stat-card gold">
                    <StatIcon src="/admin-dashboard-icons/revenue.png" fallback="💰" alt="درآمد" />
                    <div className="admin-stat-number">{formatPrice(totalRevenue)}</div>
                    <div className="admin-stat-label">درآمد کل (ریال)</div>
                </div>

                <div className="admin-stat-card green">
                    <StatIcon src="/admin-dashboard-icons/orders-recent.png" fallback="📈" alt="۳۰ روز" />
                    <div className="admin-stat-number">{toPersianNumber(ordersLast30Days)}</div>
                    <div className="admin-stat-label">سفارش ۳۰ روز اخیر</div>
                </div>
            </div>

            {/* ===== هشدارهای مهم ===== */}
            <div className="admin-section monitoring-alerts-section">
                <div className="admin-section-header">
                    <h3>
                        <span className="admin-section-icon">🔔</span>
                        هشدارهای مهم
                    </h3>
                </div>

                <div className="mon-alerts-grid">
                    <div className={`mon-alert-card ${pendingOrders > 0 ? 'danger' : 'ok'}`}>
                        <div className="mon-alert-count">{toPersianNumber(pendingOrders)}</div>
                        <div className="mon-alert-label">سفارش معلق</div>
                    </div>

                    <div className={`mon-alert-card ${failedTransactions > 0 ? 'danger' : 'ok'}`}>
                        <div className="mon-alert-count">{toPersianNumber(failedTransactions)}</div>
                        <div className="mon-alert-label">تراکنش ناموفق</div>
                    </div>

                    <div className={`mon-alert-card ${tenantsWithoutPayment > 0 ? 'warning' : 'ok'}`}>
                        <div className="mon-alert-count">{toPersianNumber(tenantsWithoutPayment)}</div>
                        <div className="mon-alert-label">نانوایی بدون درگاه</div>
                    </div>

                    <div className={`mon-alert-card ${lowStockProducts > 0 ? 'warning' : 'ok'}`}>
                        <div className="mon-alert-count">{toPersianNumber(lowStockProducts)}</div>
                        <div className="mon-alert-label">موجودی کم</div>
                    </div>
                </div>
            </div>

            {/* ===== ۵ نانوایی برتر ===== */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <span className="admin-section-icon">🏆</span>
                        ۵ نانوایی برتر
                    </h3>
                </div>

                {topTenants.length === 0 ? (
                    <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>
                ) : (
                    <div className="admin-mini-list">
                        {topTenants.map((t, idx) => (
                            <div key={t.tenantId} className="admin-mini-item">
                                <div className="admin-mini-item-icon">
                                    {toPersianNumber(idx + 1)}
                                </div>
                                <div className="admin-mini-item-info">
                                    <h4 className="admin-mini-item-title">{t.tenantName}</h4>
                                    <p className="admin-mini-item-subtitle">
                                        {toPersianNumber(t.orderCount)} سفارش
                                    </p>
                                </div>
                                <div className="admin-mini-item-value">
                                    {formatPrice(t.revenue)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MonitoringDashboard;