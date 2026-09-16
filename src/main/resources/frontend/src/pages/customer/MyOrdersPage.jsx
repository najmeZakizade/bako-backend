// src/pages/customer/MyOrdersPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getOrdersByPhone,
    getMyProfile,
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
    const [userPhone, setUserPhone] = useState(undefined);
    const [updatingId, setUpdatingId] = useState(null);

    /* ============================================================
       🎯 گرفتن شماره تماس — از API، بعد localStorage
       ============================================================ */
    useEffect(() => {
        const fetchPhone = async () => {
            try {
                const res = await getMyProfile();
                const profile = res?.data || null;
                if (profile?.phone) {
                    try {
                        const userStr = localStorage.getItem('user');
                        const cachedUser = userStr
                            ? JSON.parse(userStr)
                            : {};
                        localStorage.setItem(
                            'user',
                            JSON.stringify({ ...cachedUser, ...profile })
                        );
                    } catch (e) {
                        console.warn('⚠️ خطا در آپدیت localStorage:', e);
                    }
                    setUserPhone(profile.phone);
                    return;
                }
            } catch (err) {
                console.warn('⚠️ خطا در دریافت پروفایل:', err.message);
            }

            try {
                const userStr = localStorage.getItem('user');
                const user = userStr ? JSON.parse(userStr) : null;
                if (user?.phone) {
                    setUserPhone(user.phone);
                    return;
                }
            } catch (e) {
                console.warn('⚠️ خطا در خواندن localStorage:', e);
            }

            setUserPhone(null);
        };

        fetchPhone();
    }, []);

    /* ============================================================
       دریافت سفارشات
       ============================================================ */
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await getOrdersByPhone(userPhone);
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
        if (userPhone === undefined) return;
        if (userPhone === null) {
            setLoading(false);
            setOrders([]);
            return;
        }
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPhone]);

    /* ============================================================
       🆕 تأیید دریافت سفارش
       ============================================================ */
    const handleMarkReceived = async (orderId) => {
        if (updatingId) return;

        setUpdatingId(orderId);
        try {
            await markOrderAsReceived(orderId);

            // 🎯 آپدیت local state بدون re-fetch
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
       رندر — شماره تماس پیدا نشد
       ============================================================ */
    if (!userPhone) {
        return (
            <div className="empty-cart">
                <span
                    style={{
                        fontSize: '52px',
                        display: 'block',
                        marginBottom: '10px',
                    }}
                >
                    🔒
                </span>
                <h2>برای مشاهده سفارش‌ها ابتدا وارد شوید</h2>
                <p>
                    لطفاً وارد حساب کاربری خود شوید تا سفارش‌هایتان را
                    ببینید.
                </p>
                <button
                    className="btn-back-shop"
                    onClick={() => navigate('/login')}
                >
                    🔑 ورود به حساب
                </button>
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

                                    {/* 🆕 ستون دریافت */}
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