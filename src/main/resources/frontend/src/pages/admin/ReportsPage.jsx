// src/pages/admin/ReportsPage.jsx
import { useState, useEffect } from 'react';
import {
    getSuperAdminRevenueByTenant,
    getSuperAdminTopProducts,
    getSuperAdminRevenueTimeline,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import '../../styles/super-admin.css';

function ReportsPage() {
    const [revenueByTenant, setRevenueByTenant] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [iconError, setIconError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [revRes, prodRes, timeRes] = await Promise.allSettled([
                    getSuperAdminRevenueByTenant(),
                    getSuperAdminTopProducts(10),
                    getSuperAdminRevenueTimeline(30),
                ]);
                if (revRes.status === 'fulfilled') setRevenueByTenant(revRes.value.data || []);
                if (prodRes.status === 'fulfilled') setTopProducts(prodRes.value.data || []);
                if (timeRes.status === 'fulfilled') setTimeline(timeRes.value.data || []);
            } catch (err) {
                console.error('❌ خطا در دریافت گزارشات:', err);
                showToast('خطا در دریافت گزارشات', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    const totalRevenue = revenueByTenant.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const totalOrders = revenueByTenant.reduce((sum, r) => sum + (r.orderCount || 0), 0);
    const maxTenantRevenue = Math.max(...revenueByTenant.map((r) => r.revenue || 0), 1);
    const maxDayRevenue = Math.max(...timeline.map((t) => t.revenue || 0), 1);

    return (
        <div className="admin-reports-page">
            <div className="admin-dashboard-header">
                <h1>
                    {!iconError ? (
                        <img
                            src="/admin-sidebar-icons/reports.png"
                            alt="گزارشات"
                            className="admin-header-icon"
                            onError={() => setIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">📈</span>
                    )}
                    گزارشات
                </h1>
                <p className="admin-subtitle">تحلیل درآمد و عملکرد سیستم</p>
            </div>

            <div className="admin-stats-grid">
                <div className="admin-stat-card gold">
                    <div className="admin-stat-header"><span className="admin-stat-icon">💰</span></div>
                    <div className="admin-stat-number">{formatPrice(totalRevenue)}</div>
                    <div className="admin-stat-label">درآمد کل (ریال)</div>
                </div>
                <div className="admin-stat-card green">
                    <div className="admin-stat-header"><span className="admin-stat-icon">📦</span></div>
                    <div className="admin-stat-number">{toPersianNumber(totalOrders)}</div>
                    <div className="admin-stat-label">کل سفارشات پرداخت‌شده</div>
                </div>
                <div className="admin-stat-card blue">
                    <div className="admin-stat-header"><span className="admin-stat-icon">🏪</span></div>
                    <div className="admin-stat-number">{toPersianNumber(revenueByTenant.length)}</div>
                    <div className="admin-stat-label">نانوایی دارای فروش</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-header"><span className="admin-stat-icon">📊</span></div>
                    <div className="admin-stat-number">
                        {toPersianNumber(totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0)}
                    </div>
                    <div className="admin-stat-label">میانگین هر سفارش (ریال)</div>
                </div>
            </div>

            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <span className="admin-section-icon">📈</span>
                        درآمد ۳۰ روز اخیر
                    </h3>
                    <span className="sa-chart-total">
                        جمع: {formatPrice(timeline.reduce((s, t) => s + (t.revenue || 0), 0))} ریال
                    </span>
                </div>

                {timeline.length === 0 ? (
                    <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>
                ) : (
                    <div className="sa-chart-bars sa-chart-bars-large">
                        {timeline.map((day) => {
                            const height = Math.max(4, ((day.revenue || 0) / maxDayRevenue) * 100);
                            const [, m, d] = (day.date || '').split('-');
                            return (
                                <div key={day.date} className="sa-chart-bar-item">
                                    <div className="sa-chart-bar-wrap">
                                        <div
                                            className="sa-chart-bar"
                                            style={{ height: `${height}%` }}
                                            title={`${formatPrice(day.revenue)} ریال — ${toPersianNumber(day.orderCount)} سفارش`}
                                        />
                                    </div>
                                    <span className="sa-chart-bar-label">{toPersianNumber(d)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <span className="admin-section-icon">🏆</span>
                        درآمد به تفکیک نانوایی
                    </h3>
                </div>

                {revenueByTenant.length === 0 ? (
                    <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>
                ) : (
                    <div className="sa-hbar-list">
                        {revenueByTenant.map((r) => {
                            const width = Math.max(4, ((r.revenue || 0) / maxTenantRevenue) * 100);
                            return (
                                <div key={r.tenantId} className="sa-hbar-item">
                                    <div className="sa-hbar-info">
                                        <span className="sa-hbar-name">{r.tenantName}</span>
                                        <span className="sa-hbar-stats">
                                            {toPersianNumber(r.orderCount)} سفارش
                                        </span>
                                    </div>
                                    <div className="sa-hbar-track">
                                        <div className="sa-hbar-fill" style={{ width: `${width}%` }} />
                                    </div>
                                    <span className="sa-hbar-value">{formatPrice(r.revenue)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <span className="admin-section-icon">🥇</span>
                        ۱۰ محصول پرفروش
                    </h3>
                </div>

                {topProducts.length === 0 ? (
                    <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>
                ) : (
                    <div className="sa-table-wrapper">
                        <table className="sa-table">
                            <thead>
                            <tr>
                                <th>رتبه</th>
                                <th>تصویر</th>
                                <th>نام محصول</th>
                                <th>نانوایی</th>
                                <th>قیمت</th>
                                <th>فروش رفته</th>
                            </tr>
                            </thead>
                            <tbody>
                            {topProducts.map((p, idx) => (
                                <tr key={p.productId}>
                                    <td className="sa-cell-rank">{toPersianNumber(idx + 1)}</td>
                                    <td>
                                        {p.imageUrl ? (
                                            <img
                                                src={p.imageUrl}
                                                alt={p.name}
                                                className="sa-product-thumb"
                                                onError={(e) => (e.target.style.display = 'none')}
                                            />
                                        ) : (
                                            <span className="sa-product-thumb-placeholder">🍞</span>
                                        )}
                                    </td>
                                    <td className="sa-cell-name">{p.name}</td>
                                    <td>{p.tenantName}</td>
                                    <td className="sa-cell-mono">{formatPrice(p.price)}</td>
                                    <td>
                                            <span className="sa-badge sa-badge-orange">
                                                {toPersianNumber(p.soldCount)} عدد
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReportsPage;