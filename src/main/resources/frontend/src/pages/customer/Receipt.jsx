// src/pages/customer/Receipt.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getOrder } from '../../services/api';
import { toPersianNumber, formatPrice } from '../../utils/format';

const RECEIPT_ORDER_KEY = 'bako_customer_receipt_order';

function Receipt() {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const receiptRef = useRef(null);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ============================================================
       بارگذاری سفارش
       - اگه orderId تو URL بود → از API بگیر
       - وگرنه → از localStorage (بلافاصله بعد از ثبت سفارش)
       ============================================================ */
    useEffect(() => {
        const loadOrder = async () => {
            setLoading(true);

            try {
                if (orderId) {
                    const res = await getOrder(orderId);
                    const data = res?.data || null;
                    setOrder(data);
                    return;
                }

                const saved = localStorage.getItem(RECEIPT_ORDER_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setOrder(parsed);
                }
            } catch (e) {
                console.error('❌ خطا در بارگذاری فاکتور:', e);
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };

        loadOrder();
    }, [orderId]);

    /* ============================================================
       چاپ خودکار — اگه ?print=1 تو URL بود
       ============================================================ */
    useEffect(() => {
        if (!loading && order && searchParams.get('print') === '1') {
            const timeout = setTimeout(() => {
                const originalTitle = document.title;
                document.title = '';
                window.print();
                setTimeout(() => {
                    document.title = originalTitle;
                }, 100);
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [loading, order, searchParams]);

    /* ============================================================
       پرینت دستی
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
       شماره فاکتور
       ============================================================ */
    const getOrderNumber = () => {
        if (!order) return '—';
        const id = order._id || order.id || order.orderId || '';
        return String(id).slice(-6);
    };

    /* ============================================================
       تاریخ سفارش
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

    /* ============================================================
       🎯 استخراج فیلدهای item — با fallback chain قوی
       - localStorage: name, price, quantity
       - API (CartItem): productName, productPrice, quantity
       - ساختارهای احتمالی دیگه: nested product.name/price
       ============================================================ */
    const getItemName = (item) => {
        if (!item) return 'نامشخص';

        const name =
            item.productName ||
            item.name ||
            item.product?.name ||
            item.product?.productName ||
            item.title;

        return name && String(name).trim() !== '' ? name : 'نامشخص';
    };

    const getItemPrice = (item) => {
        if (!item) return 0;

        const price =
            item.productPrice ??
            item.price ??
            item.unitPrice ??
            item.product?.price ??
            item.product?.productPrice ??
            0;

        const num = Number(price);
        return Number.isFinite(num) ? num : 0;
    };

    const getItemQty = (item) => {
        if (!item) return 0;

        const qty = item.quantity ?? item.qty ?? 0;
        const num = Number(qty);
        return Number.isFinite(num) ? num : 0;
    };

    /* ============================================================
       رندر — بارگذاری
       ============================================================ */
    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری فاکتور...</p>
            </div>
        );
    }

    /* ============================================================
       رندر — فاکتور یافت نشد
       ============================================================ */
    if (!order) {
        return (
            <div className="receipt-empty">
                <span className="empty-icon">📄</span>
                <h2>فاکتوری برای نمایش وجود ندارد</h2>
                <p>لطفاً ابتدا یک سفارش ثبت کنید.</p>
                <button
                    className="btn-back-shop"
                    onClick={() => navigate('/')}
                >
                    🍞 بازگشت به فروشگاه
                </button>
            </div>
        );
    }

    const items = order.items || [];
    const totalPrice = order.totalPrice || 0;
    const deliveryPrice = order.deliveryPrice || 0;
    const finalPrice = order.finalPrice || totalPrice + deliveryPrice;
    const isDelivery =
        order.deliveryMethod === 'DELIVERY' ||
        order.deliveryMethod === 'DELIVERY_PEYK';
    const paymentMethodLabel = getPaymentMethodLabel();

    const showPaidBadge =
        order.paymentMethod === 'GATEWAY' &&
        order.paymentStatus === 'PAID';

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="receipt-page">
            {/* ===== دکمه‌های عملیات ===== */}
            <div className="receipt-actions no-print">
                <button
                    className="btn-secondary-action btn-back-icon"
                    onClick={() =>
                        orderId ? navigate('/my-orders') : navigate('/')
                    }
                    aria-label="بازگشت"
                    title={
                        orderId ? 'بازگشت به سفارش‌ها' : 'بازگشت به فروشگاه'
                    }
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

                {/* ===== ردیف بالا ===== */}
                <div className="receipt-header-row">

                    <div className="receipt-invoice-side">
                        <div className="receipt-info-row">
                            <span className="receipt-info-label">
                                شماره فاکتور:
                            </span>
                            <span className="receipt-info-value receipt-invoice-number">
                                #{getOrderNumber()}
                            </span>
                        </div>
                        <div className="receipt-info-row">
                            <span className="receipt-info-label">
                                تاریخ سفارش:
                            </span>
                            <span className="receipt-info-value">
                                {getOrderDate()}
                            </span>
                        </div>
                    </div>

                    <div className="receipt-title-center">
                        <h2>فاکتور فروش</h2>
                    </div>

                    <div className="receipt-logo-side">
                        <img
                            src="/bakoLogo.png"
                            alt="بیکو"
                            className="receipt-main-logo"
                            onError={(e) =>
                                (e.target.style.display = 'none')
                            }
                        />
                        <h1 className="receipt-brand-name">بیکو</h1>
                        <p className="receipt-brand-tagline">
                            هر روز، نان تازه
                        </p>
                    </div>
                </div>

                {/* ===== خط جداکننده ===== */}
                <div className="receipt-divider"></div>

                {/* ===== اطلاعات مشتری ===== */}
                <div className="receipt-customer-section">
                    <div className="receipt-customer-row">
                        <div className="receipt-info-row">
                            <span className="receipt-info-label">
                                مشتری:
                            </span>
                            <span className="receipt-info-value">
                                {order.customerName || '—'}
                            </span>
                        </div>
                        {order.phone && (
                            <div className="receipt-info-row">
                                <span className="receipt-info-label">
                                    تماس:
                                </span>
                                <span className="receipt-info-value">
                                    {toPersianNumber(order.phone)}
                                </span>
                            </div>
                        )}
                    </div>

                    {isDelivery && order.address && (
                        <div className="receipt-address-row">
                            <span className="receipt-info-label">
                                آدرس:
                            </span>
                            <span className="receipt-address-value">
                                {order.address}
                            </span>
                        </div>
                    )}

                    {paymentMethodLabel && (
                        <div className="receipt-payment-row">
                            <span className="receipt-info-label">
                                روش پرداخت:
                            </span>
                            <span className="receipt-payment-value">
                                {paymentMethodLabel}
                                {showPaidBadge && (
                                    <span className="payment-paid-badge">
                                        ✓ پرداخت شد
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {order.paymentMethod === 'GATEWAY' &&
                        order.paymentRefId && (
                            <div className="receipt-payment-row">
                                <span className="receipt-info-label">
                                    کد پیگیری:
                                </span>
                                <span className="receipt-info-value">
                                    {order.paymentRefId}
                                </span>
                            </div>
                        )}
                </div>

                {/* ============================================================
                    جدول محصولات
                    ============================================================ */}
                <div className="receipt-items-section">
                    <table className="receipt-items-table">
                        <thead>
                        <tr>
                            <th className="col-index">ردیف</th>
                            <th className="col-name">نام محصول</th>
                            <th className="col-qty">تعداد</th>
                            <th className="col-price">
                                قیمت واحد (ریال)
                            </th>
                            <th className="col-total">
                                قیمت کل (ریال)
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map((item, idx) => {
                            const itemName = getItemName(item);
                            const itemPrice = getItemPrice(item);
                            const itemQty = getItemQty(item);
                            const itemTotal = itemPrice * itemQty;

                            return (
                                <tr key={idx}>
                                    <td className="col-index">
                                        {toPersianNumber(idx + 1)}
                                    </td>
                                    <td className="col-name">
                                        {itemName}
                                    </td>
                                    <td className="col-qty">
                                        {toPersianNumber(itemQty)}
                                    </td>
                                    <td className="col-price">
                                        {formatPrice(itemPrice)}
                                    </td>
                                    <td className="col-total">
                                        {formatPrice(itemTotal)}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {/* ===== جمع‌بندی ===== */}
                <div className="receipt-totals-section">
                    <div className="receipt-total-row">
                        <span className="receipt-total-label">
                            جمع کل محصولات:
                        </span>
                        <span className="receipt-total-value">
                            {formatPrice(totalPrice)} ریال
                        </span>
                    </div>

                    {isDelivery && (
                        <div className="receipt-total-row receipt-total-delivery">
                            <span className="receipt-total-label">
                                هزینه پیک:
                            </span>
                            <span className="receipt-total-value">
                                {deliveryPrice > 0
                                    ? `${formatPrice(
                                        deliveryPrice
                                    )} ریال`
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