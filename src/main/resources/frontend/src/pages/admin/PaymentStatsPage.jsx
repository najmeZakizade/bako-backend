// src/pages/admin/PaymentStatsPage.jsx
import { useState, useEffect } from 'react';
import { getPaymentStatistics } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';

function PaymentStatsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const res = await getPaymentStatistics();
                setStats(res.data || {});
            } catch (err) {
                console.error('❌ خطا در دریافت آمار:', err);
                // mock data برای نمایش
                setStats({
                    totalTransactions: 0,
                    successfulTransactions: 0,
                    failedTransactions: 0,
                    totalAmount: 0,
                    averageAmount: 0,
                });
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

    return (
        <div className="payment-stats-page">
            <div className="admin-dashboard-header">
                <h1>📈 آمار پرداخت‌ها</h1>
                <p className="admin-subtitle">
                    نمای کلی از تراکنش‌های سیستم
                </p>
            </div>

            <div className="payment-stats-grid">
                <div className="admin-stat-card gold">
                    <span className="admin-stat-icon">📋</span>
                    <div className="admin-stat-number">
                        {toPersianNumber(stats?.totalTransactions || 0)}
                    </div>
                    <div className="admin-stat-label">کل تراکنش‌ها</div>
                </div>

                <div className="admin-stat-card green">
                    <span className="admin-stat-icon">✅</span>
                    <div className="admin-stat-number">
                        {toPersianNumber(stats?.successfulTransactions || 0)}
                    </div>
                    <div className="admin-stat-label">موفق</div>
                </div>

                <div className="admin-stat-card red">
                    <span className="admin-stat-icon">❌</span>
                    <div className="admin-stat-number">
                        {toPersianNumber(stats?.failedTransactions || 0)}
                    </div>
                    <div className="admin-stat-label">ناموفق</div>
                </div>
            </div>

            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <span className="admin-section-icon">💰</span>
                        مبالغ
                    </h3>
                </div>

                <div className="admin-mini-list">
                    <div className="admin-mini-item">
                        <div className="admin-mini-item-icon">💰</div>
                        <div className="admin-mini-item-info">
                            <h4 className="admin-mini-item-title">
                                مجموع مبالغ
                            </h4>
                            <p className="admin-mini-item-subtitle">
                                جمع کل تراکنش‌های موفق
                            </p>
                        </div>
                        <div className="admin-mini-item-value">
                            {formatPrice(stats?.totalAmount || 0)} ریال
                        </div>
                    </div>

                    <div className="admin-mini-item">
                        <div className="admin-mini-item-icon">📊</div>
                        <div className="admin-mini-item-info">
                            <h4 className="admin-mini-item-title">
                                میانگین هر تراکنش
                            </h4>
                            <p className="admin-mini-item-subtitle">
                                میانگین مبلغ پرداختی
                            </p>
                        </div>
                        <div className="admin-mini-item-value">
                            {formatPrice(stats?.averageAmount || 0)} ریال
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaymentStatsPage;