// src/pages/monitoring/MonitoringTransactionsPage.jsx
import { useState, useEffect } from 'react';
import { getMonitoringTransactions, getAllTenants } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import '../../styles/super-admin.css';

// ============================================================
//  وضعیت پرداخت
// ============================================================
const STATUS_MAP = {
    PAID: { label: 'پرداخت شده', class: 'sa-badge-green' },
    PENDING: { label: 'در انتظار', class: 'sa-badge-orange' },
    FAILED: { label: 'ناموفق', class: 'sa-badge-gray' },
    REFUNDED: { label: 'بازگشت داده شده', class: 'sa-badge-blue' },
};

// ============================================================
//  روش پرداخت (فارسی)
// ============================================================
const PAYMENT_METHOD_MAP = {
    CASH: 'نقدی',
    POS: 'کارتخوان',
    GATEWAY: 'درگاه الکترونیکی',
    ONLINE: 'درگاه الکترونیکی',
};

function MonitoringTransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [headerIconError, setHeaderIconError] = useState(false);

    const [tenantFilter, setTenantFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [txRes, tenantsRes] = await Promise.allSettled([
                    getMonitoringTransactions(),
                    getAllTenants(),
                ]);
                if (txRes.status === 'fulfilled') setTransactions(txRes.value.data || []);
                if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value.data || []);
            } catch (err) {
                console.error('❌ خطا در دریافت تراکنش‌ها:', err);
                showToast('خطا در دریافت تراکنش‌ها', 'error');
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = transactions.filter((tx) => {
        if (tenantFilter && tx.tenantId !== tenantFilter) return false;
        if (statusFilter && tx.paymentStatus !== statusFilter) return false;
        return true;
    });

    const getStatusInfo = (status) =>
        STATUS_MAP[status] || { label: status || '—', class: 'sa-badge-gray' };

    const getPaymentMethodLabel = (method) => {
        if (!method) return '—';
        return PAYMENT_METHOD_MAP[method.toUpperCase()] || method;
    };

    const getTenantName = (tenantId) => {
        if (!tenantId) return '—';
        const t = tenants.find((x) => (x._id || x.id) === tenantId);
        return t ? t.name : 'نامشخص';
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    return (
        <div className="monitoring-transactions-page">
            <div className="admin-dashboard-header">
                <h1>
                    {!headerIconError ? (
                        <img
                            src="/monitoring-sidebar-icons/transactions.png"
                            alt="تراکنش‌ها"
                            className="admin-header-icon"
                            onError={() => setHeaderIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">📋</span>
                    )}
                    تراکنش‌ها
                </h1>
                <p className="admin-subtitle">
                    {toPersianNumber(filtered.length)} تراکنش
                </p>
            </div>

            <div className="admin-toolbar">
                <select
                    value={tenantFilter}
                    onChange={(e) => setTenantFilter(e.target.value)}
                    className="admin-filter-select"
                >
                    <option value="">همه نانوایی‌ها</option>
                    {tenants.map((t) => {
                        const id = t._id || t.id;
                        return (
                            <option key={id} value={id}>
                                {t.name}
                            </option>
                        );
                    })}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="admin-filter-select"
                >
                    <option value="">همه وضعیت‌ها</option>
                    <option value="PAID">پرداخت شده</option>
                    <option value="PENDING">در انتظار</option>
                    <option value="FAILED">ناموفق</option>
                    <option value="REFUNDED">بازگشت داده شده</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">📋</span>
                    <h3>تراکنشی یافت نشد</h3>
                    <p>هنوز تراکنشی ثبت نشده است</p>
                </div>
            ) : (
                <div className="sa-table-wrapper">
                    <table className="sa-table">
                        <thead>
                        <tr>
                            <th>شناسه</th>
                            <th>نانوایی</th>
                            <th>مشتری</th>
                            <th>موبایل</th>
                            <th>مبلغ (ریال)</th>
                            <th>روش پرداخت</th>
                            <th>وضعیت</th>
                            <th>تاریخ</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((tx) => {
                            const id = tx.id || tx._id;
                            const status = getStatusInfo(tx.paymentStatus);
                            const date = tx.orderDate
                                ? new Date(tx.orderDate).toLocaleDateString('fa-IR')
                                : '—';

                            return (
                                <tr key={id}>
                                    <td className="sa-cell-normal">
                                        #{toPersianNumber(String(id).slice(-6))}
                                    </td>
                                    <td>{getTenantName(tx.tenantId)}</td>
                                    <td>{tx.customerName || '—'}</td>
                                    <td className="sa-cell-normal">
                                        {tx.phone ? toPersianNumber(tx.phone) : '—'}
                                    </td>
                                    <td className="sa-cell-normal">
                                        {formatPrice(tx.totalPrice || 0)}
                                    </td>
                                    <td>{getPaymentMethodLabel(tx.paymentMethod)}</td>
                                    <td>
                                            <span className={`sa-badge ${status.class}`}>
                                                {status.label}
                                            </span>
                                    </td>
                                    <td>{date}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default MonitoringTransactionsPage;