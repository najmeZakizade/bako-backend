// src/pages/admin/TransactionsPage.jsx
import { useState, useEffect } from 'react';
import { getSuperAdminTransactions, getAllTenants } from '../../services/api';
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
//  🆕 روش پرداخت (فارسی)
// ============================================================
const PAYMENT_METHOD_MAP = {
    CASH: 'نقدی',
    POS: 'کارتخوان',
    GATEWAY: 'درگاه الکترونیکی',
    ONLINE: 'درگاه الکترونیکی',
};

function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [iconError, setIconError] = useState(false);

    const [tenantFilter, setTenantFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // ============================================================
    //  بارگذاری
    // ============================================================
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [txRes, tenantsRes] = await Promise.allSettled([
                    getSuperAdminTransactions(),
                    getAllTenants(),
                ]);
                if (txRes.status === 'fulfilled') {
                    setTransactions(txRes.value.data || []);
                }
                if (tenantsRes.status === 'fulfilled') {
                    setTenants(tenantsRes.value.data || []);
                }
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

    // ============================================================
    //  فیلتر
    // ============================================================
    const filtered = transactions.filter((tx) => {
        if (tenantFilter && tx.tenantId !== tenantFilter) return false;
        if (statusFilter && tx.paymentStatus !== statusFilter) return false;
        return true;
    });

    // ============================================================
    //  Helper ها
    // ============================================================
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

    // ============================================================
    //  رندر
    // ============================================================
    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    return (
        <div className="transactions-page">
            <div className="admin-dashboard-header">
                <h1>
                    {!iconError ? (
                        <img
                            src="/admin-sidebar-icons/transactions.png"
                            alt="تراکنش‌ها"
                            className="admin-header-icon"
                            onError={() => setIconError(true)}
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

            {/* ===== فیلترها ===== */}
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

            {/* ===== جدول ===== */}
            {filtered.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">📋</span>
                    <h3>تراکنشی یافت نشد</h3>
                    <p>هنوز تراکنشی ثبت نشده است</p>
                </div>
            ) : (
                <div className="sa-table-wrapper">
                    <table className="sa-table responsive-cards-table">
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
                                ? new Date(tx.orderDate).toLocaleDateString(
                                    'fa-IR'
                                )
                                : '—';

                            return (
                                <tr key={id}>
                                    {/* شناسه — فارسی + فونت سایت */}
                                    <td className="sa-cell-normal" data-label="شناسه">
                                        #
                                        {toPersianNumber(
                                            String(id).slice(-6)
                                        )}
                                    </td>

                                    {/* نانوایی */}
                                    <td data-label="نانوایی">
                                        {getTenantName(tx.tenantId)}
                                    </td>

                                    {/* مشتری */}
                                    <td data-label="مشتری">
                                        {tx.customerName || '—'}
                                    </td>

                                    {/* موبایل — فارسی + فونت سایت */}
                                    <td className="sa-cell-normal" data-label="موبایل">
                                        {tx.phone
                                            ? toPersianNumber(tx.phone)
                                            : '—'}
                                    </td>

                                    {/* مبلغ — فارسی + فونت سایت */}
                                    <td className="sa-cell-normal" data-label="مبلغ (ریال)">
                                        {formatPrice(tx.totalPrice || 0)}
                                    </td>

                                    {/* روش پرداخت — فارسی */}
                                    <td data-label="روش پرداخت">
                                        {getPaymentMethodLabel(
                                            tx.paymentMethod
                                        )}
                                    </td>

                                    {/* وضعیت */}
                                    <td data-label="وضعیت">
                                        <span
                                            className={`sa-badge ${status.class}`}
                                        >
                                            {status.label}
                                        </span>
                                    </td>

                                    {/* تاریخ */}
                                    <td data-label="تاریخ">{date}</td>
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

export default TransactionsPage;