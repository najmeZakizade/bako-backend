// src/pages/monitoring/MonitoringAlertsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonitoringAlerts } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import '../../styles/super-admin.css';
import '../../styles/monitoring.css';

// ============================================================
//  کارت هشدار (رنگ‌بندی شده بر اساس نوع)
// ============================================================
function AlertCard({ icon, title, count, level, children }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`mon-alert-section mon-alert-${level}`}>
            <div
                className="mon-alert-header"
                onClick={() => setExpanded((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded((prev) => !prev);
                    }
                }}
            >
                <div className="mon-alert-title">
                    <span className="mon-alert-icon">{icon}</span>
                    <h3>{title}</h3>
                </div>
                <div className="mon-alert-right">
                    <span className={`mon-alert-count-badge mon-count-${level}`}>
                        {toPersianNumber(count)}
                    </span>
                    <span className={`mon-alert-arrow ${expanded ? 'open' : ''}`}>
                        ▼
                    </span>
                </div>
            </div>

            {expanded && count > 0 && (
                <div className="mon-alert-body">{children}</div>
            )}

            {expanded && count === 0 && (
                <div className="mon-alert-body">
                    <p className="mon-alert-empty">
                        ✅ هیچ موردی در این دسته وجود ندارد
                    </p>
                </div>
            )}
        </div>
    );
}

function MonitoringAlertsPage() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [headerIconError, setHeaderIconError] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                setLoading(true);
                const res = await getMonitoringAlerts();
                setAlerts(res.data || {});
            } catch (err) {
                console.error('❌ خطا در دریافت هشدارها:', err);
                showToast('خطا در دریافت هشدارها', 'error');
                setAlerts({});
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    const counts = alerts?.counts || {};
    const pendingOrders = alerts?.pendingOrders || [];
    const failedTransactions = alerts?.failedTransactions || [];
    const tenantsWithoutPayment = alerts?.tenantsWithoutPayment || [];
    const lowStockProducts = alerts?.lowStockProducts || [];
    const expiringSubscriptions = alerts?.expiringSubscriptions || [];

    const totalAlerts = counts.total || 0;

    return (
        <div className="monitoring-alerts-page">
            {/* ===== هدر ===== */}
            <div className="admin-dashboard-header">
                <h1>
                    {!headerIconError ? (
                        <img
                            src="/monitoring-sidebar-icons/alerts.png"
                            alt="هشدارها"
                            className="admin-header-icon"
                            onError={() => setHeaderIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">🔔</span>
                    )}
                    هشدارها و اعلان‌ها
                </h1>
                <p className="admin-subtitle">
                    {totalAlerts > 0
                        ? `${toPersianNumber(totalAlerts)} مورد نیاز به بررسی`
                        : '✅ همه چیز مرتب است'}
                </p>
            </div>

            {/* ===== خلاصه ===== */}
            <div className="mon-alerts-grid">
                <div className={`mon-alert-card ${counts.pendingOrders > 0 ? 'danger' : 'ok'}`}>
                    <div className="mon-alert-count">{toPersianNumber(counts.pendingOrders || 0)}</div>
                    <div className="mon-alert-label">سفارش معلق</div>
                </div>
                <div className={`mon-alert-card ${counts.failedTransactions > 0 ? 'danger' : 'ok'}`}>
                    <div className="mon-alert-count">{toPersianNumber(counts.failedTransactions || 0)}</div>
                    <div className="mon-alert-label">تراکنش ناموفق</div>
                </div>
                <div className={`mon-alert-card ${counts.tenantsWithoutPayment > 0 ? 'warning' : 'ok'}`}>
                    <div className="mon-alert-count">{toPersianNumber(counts.tenantsWithoutPayment || 0)}</div>
                    <div className="mon-alert-label">نانوایی بدون درگاه</div>
                </div>
                <div className={`mon-alert-card ${counts.lowStockProducts > 0 ? 'warning' : 'ok'}`}>
                    <div className="mon-alert-count">{toPersianNumber(counts.lowStockProducts || 0)}</div>
                    <div className="mon-alert-label">موجودی کم</div>
                </div>
            </div>

            {/* ===== بخش‌های تفصیلی ===== */}
            <div className="mon-alerts-sections">
                {/* ۱. سفارشات معلق */}
                <AlertCard
                    icon="⏰"
                    title="سفارشات معلق (بیش از ۲ ساعت)"
                    count={counts.pendingOrders || 0}
                    level="danger"
                >
                    <div className="mon-table-wrapper">
                        <table className="mon-table responsive-cards-table">
                            <thead>
                            <tr>
                                <th>شناسه</th>
                                <th>نانوایی</th>
                                <th>مشتری</th>
                                <th>مبلغ</th>
                                <th>زمان انتظار</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pendingOrders.map((item) => (
                                <tr key={item.orderId}>
                                    <td className="mon-cell-id" data-label="شناسه">
                                        #{toPersianNumber(String(item.orderId).slice(-6))}
                                    </td>
                                    <td data-label="نانوایی">{item.tenantName}</td>
                                    <td data-label="مشتری">{item.customerName || '—'}</td>
                                    <td data-label="مبلغ">{formatPrice(item.totalPrice || 0)}</td>
                                    <td className="mon-cell-danger" data-label="زمان انتظار">
                                        {toPersianNumber(item.hoursWaiting)} ساعت
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </AlertCard>

                {/* ۲. تراکنش‌های ناموفق */}
                <AlertCard
                    icon="❌"
                    title="تراکنش‌های ناموفق (۲۴ ساعت اخیر)"
                    count={counts.failedTransactions || 0}
                    level="danger"
                >
                    <div className="mon-table-wrapper">
                        <table className="mon-table responsive-cards-table">
                            <thead>
                            <tr>
                                <th>شناسه</th>
                                <th>نانوایی</th>
                                <th>مشتری</th>
                                <th>مبلغ</th>
                            </tr>
                            </thead>
                            <tbody>
                            {failedTransactions.map((item) => (
                                <tr key={item.orderId}>
                                    <td className="mon-cell-id" data-label="شناسه">
                                        #{toPersianNumber(String(item.orderId).slice(-6))}
                                    </td>
                                    <td data-label="نانوایی">{item.tenantName}</td>
                                    <td data-label="مشتری">{item.customerName || '—'}</td>
                                    <td data-label="مبلغ">{formatPrice(item.totalPrice || 0)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </AlertCard>

                {/* ۳. نانوایی بدون درگاه */}
                <AlertCard
                    icon="💳"
                    title="نانوایی‌های فعال بدون درگاه پرداخت"
                    count={counts.tenantsWithoutPayment || 0}
                    level="warning"
                >
                    <div className="mon-table-wrapper">
                        <table className="mon-table responsive-cards-table">
                            <thead>
                            <tr>
                                <th>نام نانوایی</th>
                                <th>تعداد محصولات</th>
                                <th>Merchant ID</th>
                                <th>عملیات</th>
                            </tr>
                            </thead>
                            <tbody>
                            {tenantsWithoutPayment.map((item) => (
                                <tr key={item.tenantId}>
                                    <td data-label="نام نانوایی">{item.tenantName}</td>
                                    <td data-label="تعداد محصولات">
                                        {toPersianNumber(item.productCount)}
                                    </td>
                                    <td data-label="Merchant ID">
                                        {item.hasMerchantId ? (
                                            <span className="mon-badge-info">
                                                    ثبت شده (غیرفعال)
                                                </span>
                                        ) : (
                                            <span className="mon-badge-warning">
                                                    تنظیم نشده
                                                </span>
                                        )}
                                    </td>
                                    <td data-label="عملیات">
                                        <button
                                            type="button"
                                            className="mon-btn-link"
                                            onClick={() =>
                                                navigate(
                                                    `/admin/tenants/${item.tenantId}/payment-config`
                                                )
                                            }
                                        >
                                            تنظیم پرداخت →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </AlertCard>

                {/* ۴. موجودی کم */}
                <AlertCard
                    icon="📦"
                    title="محصولات با موجودی کم (کمتر از ۵)"
                    count={counts.lowStockProducts || 0}
                    level="warning"
                >
                    <div className="mon-table-wrapper">
                        <table className="mon-table responsive-cards-table">
                            <thead>
                            <tr>
                                <th>نام محصول</th>
                                <th>نانوایی</th>
                                <th>موجودی</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lowStockProducts.map((item) => (
                                <tr key={item.productId}>
                                    <td data-label="نام محصول">{item.name}</td>
                                    <td data-label="نانوایی">{item.tenantName}</td>
                                    <td className="mon-cell-warning" data-label="موجودی">
                                        {toPersianNumber(item.stock)} عدد
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </AlertCard>

                {/* ۵. اشتراک‌های نزدیک انقضا */}
                <AlertCard
                    icon="📅"
                    title="اشتراک‌های نزدیک انقضا (کمتر از ۷ روز)"
                    count={counts.expiringSubscriptions || 0}
                    level="warning"
                >
                    <div className="mon-table-wrapper">
                        <table className="mon-table responsive-cards-table">
                            <thead>
                            <tr>
                                <th>نام نانوایی</th>
                                <th>روزهای باقی‌مانده</th>
                            </tr>
                            </thead>
                            <tbody>
                            {expiringSubscriptions.map((item) => (
                                <tr key={item.tenantId}>
                                    <td data-label="نام نانوایی">{item.tenantName}</td>
                                    <td className="mon-cell-warning" data-label="روزهای باقی‌مانده">
                                        {toPersianNumber(item.daysLeft)} روز
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </AlertCard>
            </div>
        </div>
    );
}

export default MonitoringAlertsPage;