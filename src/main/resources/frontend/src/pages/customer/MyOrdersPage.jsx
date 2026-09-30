// src/pages/customer/MyOrdersPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getMyOrders,
    markOrderAsReceived,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';

const STATUS_MAP = {
    PENDING: { label: 'در انتظار', class: 'badge-honey' },
    CONFIRMED: { label: 'تأیید شده', class: 'badge-blue' },
    PREPARING: { label: 'در حال آماده‌سازی', class: 'badge-orange' },
    READY: { label: 'آماده تحویل', class: 'badge-purple' },
    DELIVERED: { label: 'تحویل شد', class: 'badge-herb' },
    CANCELLED: { label: 'لغو شده', class: 'badge-red' },
};

function MyOrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    /* ============================================================
       دریافت سفارشات شخصی (از JWT — بدون فیلتر tenantId)
       ============================================================ */
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await getMyOrders();
            const data = res.data || [];

            const sorted = [...data].sort((a, b) => {
                const dateA = new Date(a.orderDate || a.createdAt || 0);
                const dateB = new Date(b.orderDate || b.createdAt || 0);
                return dateB - dateA;
            });

            setOrders(sorted);
        } catch (err) {
            console.error('❌ خطا در دریافت سفارش‌ها:', err);
            showToast('خطا در دریافت سفارش‌ها', 'error');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    /* ============================================================
       تأیید دریافت سفارش
       ============================================================ */
    const handleMarkReceived = async (orderId) => {
        if (updatingId) return;

        setUpdatingId(orderId);
        try {
            await markOrderAsReceived(orderId);

            setOrders((prev) =>
                prev.map((o) =>
                    String(o._id || o.id) === String(orderId)
                        ? {
                            ...o,
                            customerReceived: true,
                            customerReceivedAt: new Date().toISOString(),
                        }
                        : o
                )
            );

            showToast('تأیید دریافت سفارش ثبت شد', 'success');
        } catch (err) {
            console.error('❌ خطا در تأیید دریافت:', err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                'خطا در تأیید دریافت';
            showToast(msg, 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    /* ============================================================
       تاریخ سفارش
       ============================================================ */
    const getOrderDate = (order) => {
        if (!order?.orderDate && !order?.createdAt) return '—';
        try {
            const date = new Date(order.orderDate || order.createdAt);
            const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).formatToParts(date);
            const get = (t) =>
                parts.find((p) => p.type === t)?.value || '';
            return `${get('year')}/${get('month')}/${get('day')} - ${get(
                'hour'
            )}:${get('minute')}`;
        } catch {
            return '—';
        }
    };

    const getStatusInfo = (status) =>
        STATUS_MAP[status] || { label: status || '—', class: 'badge-gray' };

    /* ============================================================
       رندر — بارگذاری
       ============================================================ */
    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری سفارش‌ها...</p>
            </div>
        );
    }

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="my-orders-page">

            <PageTitle
                image="/sidebar-icons/my-orders.png"
                fallbackIcon="📦"
                title="سفارش‌های من"
                count={`${toPersianNumber(orders.length)} سفارش`}
            />

            {orders.length === 0 ? (
                <div className="empty-cart">
                    <span
                        style={{
                            fontSize: '52px',
                            display: 'block',
                            marginBottom: '10px',
                        }}
                    >
                        📭
                    </span>
                    <h2>هنوز سفارشی ثبت نکرده‌اید</h2>
                    <p>با ثبت اولین سفارش، اینجا نمایش داده می‌شود.</p>
                    <button
                        className="btn-back-shop"
                        onClick={() => navigate('/')}
                    >
                        🍞 مشاهده نانوایی‌ها
                    </button>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table className="order-table my-orders-table">
                        <thead>
                        <tr>
                            <th>شماره</th>
                            <th>تاریخ</th>
                            <th>تعداد اقلام</th>
                            <th>مبلغ (ریال)</th>
                            <th>وضعیت</th>
                            <th>دریافت</th>
                            <th>فاکتور</th>
                        </tr>
                        </thead>
                        <tbody>
                        {orders.map((order) => {
                            const id = order._id || order.id;
                            const status = getStatusInfo(order.status);
                            const isReceived =
                                order.customerReceived === true;
                            const isUpdating =
                                updatingId === id;

                            return (
                                <tr key={id}>
                                    <td>
                                        #
                                        {toPersianNumber(
                                            String(id).slice(-6)
                                        )}
                                    </td>
                                    <td>{getOrderDate(order)}</td>
                                    <td>
                                        {toPersianNumber(
                                            order.items?.length || 0
                                        )}
                                    </td>
                                    <td>
                                        {formatPrice(
                                            order.totalPrice || 0
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`badge ${status.class}`}
                                        >
                                            {status.label}
                                        </span>
                                    </td>

                                    {/* ستون دریافت */}
                                    <td>
                                        {isReceived ? (
                                            <span className="received-badge">
                                                ✅ دریافت کردم
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn-mark-received"
                                                onClick={() =>
                                                    handleMarkReceived(id)
                                                }
                                                disabled={isUpdating}
                                                title="کلیک کنید تا تأیید کنید"
                                            >
                                                {isUpdating
                                                    ? '⏳'
                                                    : '🔘 دریافت نکردم'}
                                            </button>
                                        )}
                                    </td>

                                    <td>
                                        <Link
                                            to={`/receipt/${id}`}
                                            className="btn-receipt-link"
                                            title="مشاهده فاکتور"
                                        >
                                            🧾 فاکتور
                                        </Link>
                                    </td>
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

export default MyOrdersPage;