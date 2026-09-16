// src/pages/bakery/Receipt.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPersianNumber, formatPrice } from '../../utils/format';

const LAST_ORDER_KEY = 'bako_last_order';

function Receipt() {
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const receiptRef = useRef(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LAST_ORDER_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setOrder(parsed);
            }
        } catch (e) {
            console.error('خطا در بارگذاری فاکتور:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    /* ============================================================
       پرینت — موقتاً تیتر صفحه رو خالی می‌کنیم تا در چاپ نیاد
       ============================================================ */
    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = '';

        window.print();

        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    };

    /* ============================================================
       شماره فاکتور — اعداد لاتین
       ============================================================ */
    const getOrderNumber = () => {
        if (!order) return '—';
        const id = order._id || order.id || order.orderId || '';
        return String(id).slice(-6);
    };

    /* ============================================================
       تاریخ سفارش — شمسی با اعداد لاتین
       ============================================================ */
    const getOrderDate = () => {
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

            const get = (type) =>
                parts.find((p) => p.type === type)?.value || '';

            const year = get('year');
            const month = get('month').padStart(2, '0');
            const day = get('day').padStart(2, '0');
            const hour = get('hour').padStart(2, '0');
            const minute = get('minute').padStart(2, '0');

            return `${year}/${month}/${day} - ${hour}:${minute}`;
        } catch {
            return '—';
        }
    };

    /* ============================================================
       برچسب روش پرداخت
       ============================================================ */
    const getPaymentMethodLabel = () => {
        const method = order?.paymentMethod;
        if (method === 'CASH') return '💵 نقدی';
        if (method === 'POS') return '💳 کارتخوان حضوری';
        if (method === 'GATEWAY') return '🌐 درگاه آنلاین';
        return null;
    };

    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری فاکتور...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="receipt-empty">
                <span className="empty-icon">📄</span>
                <h2>فاکتوری برای نمایش وجود ندارد</h2>
                <p>لطفاً ابتدا یک سفارش ثبت کنید.</p>
                <button
                    className="btn-back-shop"
                    onClick={() => navigate('/bakery/counter')}
                >
                    🍞 بازگشت به سفارشات
                </button>
            </div>
        );
    }

    const items = order.items || [];
    const totalPrice = order.totalPrice || 0;
    const deliveryPrice = order.deliveryPrice || 0;
    const finalPrice = order.finalPrice || (totalPrice + deliveryPrice);
    const isDelivery = order.deliveryMethod === 'DELIVERY';
    const paymentMethodLabel = getPaymentMethodLabel();

    return (
        <div className="receipt-page">
            {/* ===== دکمه‌های عملیات (در پرینت مخفی) ===== */}
            <div className="receipt-actions no-print">
                <button
                    className="btn-secondary-action btn-back-icon"
                    onClick={() => navigate('/bakery/counter')}
                    aria-label="بازگشت"
                    title="بازگشت"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </button>
                <button className="btn-print-action" onClick={handlePrint}>
                    🖨️ پرینت فاکتور
                </button>
            </div>

            {/* ===== محتوای فاکتور ===== */}
            <div className="receipt-container" ref={receiptRef}>

                {/* ===== ردیف بالا: شماره/تاریخ (چپ) + عنوان (وسط) + لوگو (راست) ===== */}
                <div className="receipt-header-row">

                    {/* سمت چپ: شماره فاکتور + تاریخ سفارش */}
                    <div className="receipt-invoice-side">
                        <div className="receipt-info-row">
                            <span className="receipt-info-label">شماره فاکتور:</span>
                            <span className="receipt-info-value receipt-invoice-number">
                                #{getOrderNumber()}
                            </span>
                        </div>
                        <div className="receipt-info-row">
                            <span className="receipt-info-label">تاریخ سفارش:</span>
                            <span className="receipt-info-value">
                                {getOrderDate()}
                            </span>
                        </div>
                    </div>

                    {/* وسط: عنوان فاکتور */}
                    <div className="receipt-title-center">
                        <h2>فاکتور فروش</h2>
                    </div>

                    {/* سمت راست: لوگو + برند */}
                    <div className="receipt-logo-side">
                        <img
                            src="/bakoLogo.png"
                            alt="بیکو"
                            className="receipt-main-logo"
                            onError={(e) => (e.target.style.display = 'none')}
                        />
                        <h1 className="receipt-brand-name">بیکو</h1>
                        <p className="receipt-brand-tagline">هر روز، نان تازه</p>
                    </div>
                </div>

                {/* ===== خط جداکننده ===== */}
                <div className="receipt-divider"></div>

                {/* ===== اطلاعات مشتری ===== */}
                <div className="receipt-customer-section">
                    {/* خط اول: مشتری + تماس */}
                    <div className="receipt-customer-row">
                        <div className="receipt-info-row">
                            <span className="receipt-info-label">مشتری:</span>
                            <span className="receipt-info-value">
                                {order.customerName || '—'}
                            </span>
                        </div>
                        {order.phone && (
                            <div className="receipt-info-row">
                                <span className="receipt-info-label">تماس:</span>
                                <span className="receipt-info-value">
                                    {toPersianNumber(order.phone)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* خط دوم: آدرس تمام‌عرض */}
                    {isDelivery && order.address && (
                        <div className="receipt-address-row">
                            <span className="receipt-info-label">آدرس:</span>
                            <span className="receipt-address-value">
                                {order.address}
                            </span>
                        </div>
                    )}

                    {/* 🆕 خط سوم: روش پرداخت (فقط اگه تعیین شده) */}
                    {paymentMethodLabel && (
                        <div className="receipt-payment-row">
                            <span className="receipt-info-label">روش پرداخت:</span>
                            <span className="receipt-payment-value">
                                {paymentMethodLabel}
                                {order.paymentStatus === 'PAID' && (
                                    <span className="payment-paid-badge">
                                        ✓ پرداخت شده
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* 🆕 کد پیگیری درگاه (اگه پرداخت آنلاین باشه) */}
                    {order.paymentMethod === 'GATEWAY' && order.paymentRefId && (
                        <div className="receipt-payment-row">
                            <span className="receipt-info-label">کد پیگیری:</span>
                            <span className="receipt-info-value">
                                {order.paymentRefId}
                            </span>
                        </div>
                    )}
                </div>

                {/* ===== جدول محصولات ===== */}
                <div className="receipt-items-section">
                    <table className="receipt-items-table">
                        <thead>
                        <tr>
                            <th className="col-index">ردیف</th>
                            <th className="col-name">نام محصول</th>
                            <th className="col-qty">تعداد</th>
                            <th className="col-price">قیمت واحد (ریال)</th>
                            <th className="col-total">قیمت کل (ریال)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="col-index">
                                    {toPersianNumber(idx + 1)}
                                </td>
                                <td className="col-name">{item.name}</td>
                                <td className="col-qty">
                                    {toPersianNumber(item.quantity)}
                                </td>
                                <td className="col-price">
                                    {formatPrice(item.price)}
                                </td>
                                <td className="col-total">
                                    {formatPrice(item.price * item.quantity)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* ===== جمع‌بندی ===== */}
                <div className="receipt-totals-section">
                    <div className="receipt-total-row">
                        <span className="receipt-total-label">جمع کل محصولات:</span>
                        <span className="receipt-total-value">
                            {formatPrice(totalPrice)} ریال
                        </span>
                    </div>

                    {isDelivery && (
                        <div className="receipt-total-row receipt-total-delivery">
                            <span className="receipt-total-label">هزینه پیک:</span>
                            <span className="receipt-total-value">
                                {deliveryPrice > 0
                                    ? `${formatPrice(deliveryPrice)} ریال`
                                    : '—'}
                            </span>
                        </div>
                    )}

                    <div className="receipt-total-row receipt-total-final">
                        <span className="receipt-total-label-final">
                            مبلغ قابل پرداخت:
                        </span>
                        <span className="receipt-total-value-final">
                            {formatPrice(finalPrice)} ریال
                        </span>
                    </div>
                </div>

                {/* ===== پیام تشکر ===== */}
                <div className="receipt-thanks">
                    <div className="receipt-thanks-line"></div>
                    <p className="receipt-thanks-text">
                        از خرید شما متشکریم 🌾
                    </p>
                    <p className="receipt-thanks-sub">
                        بیکو — همراه لحظه‌های خوشمزه شما
                    </p>
                    <div className="receipt-thanks-line"></div>
                </div>

            </div>
        </div>
    );
}

export default Receipt;