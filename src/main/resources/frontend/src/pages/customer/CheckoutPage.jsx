// src/pages/customer/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCartItems, submitOrder, clearCart } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import '../../styles/customer-delivery.css';

const CHECKOUT_KEY = 'bako_customer_checkout';

function CheckoutPage() {
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState(0);
    const [checkoutInfo, setCheckoutInfo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    /* ============================================================
       بارگذاری — سبد + اطلاعات تحویل
       ============================================================ */
    useEffect(() => {
        // اطلاعات تحویل از localStorage
        let deliveryData = null;
        try {
            const raw = localStorage.getItem(CHECKOUT_KEY);
            deliveryData = raw ? JSON.parse(raw) : null;
            setCheckoutInfo(deliveryData);
        } catch (e) {
            console.error('خطا در خواندن اطلاعات تحویل:', e);
        }

        // اگه اطلاعات تحویل نیست → برگرد به delivery
        if (!deliveryData) {
            showToast('لطفاً ابتدا روش تحویل را انتخاب کنید', 'error');
            navigate('/delivery');
            return;
        }

        // سبد خرید
        const fetchCart = async () => {
            try {
                const response = await getCartItems();
                const data = response.data || [];
                setItems(data);

                let total = 0;
                data.forEach((item) => {
                    total += (item.product?.price || 0) * (item.quantity || 0);
                });
                setTotalPrice(total);

                if (data.length === 0) {
                    navigate('/cart');
                }
            } catch (err) {
                console.error('❌ خطا در دریافت سبد خرید:', err);
                showToast('خطا در دریافت سبد خرید', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCart();
    }, [navigate]);

    /* ============================================================
       ثبت نهایی سفارش
       ============================================================ */
    const handleSubmit = async () => {
        if (!checkoutInfo) {
            showToast('اطلاعات تحویل ناقص است', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const orderItems = items.map((item) => ({
                productId: String(
                    item.product?._id || item.product?.id
                ),
                name: String(item.product?.name || ''),
                quantity: Number(item.quantity),
                price: Number(item.product?.price || 0),
            }));

            const deliveryPrice =
                checkoutInfo.deliveryMethod === 'DELIVERY'
                    ? checkoutInfo.deliveryPrice || 0
                    : 0;

            const orderData = {
                customerName: checkoutInfo.customerName || '',
                phone: checkoutInfo.customerPhone || '',
                address:
                    checkoutInfo.deliveryMethod === 'PICKUP'
                        ? 'تحویل حضوری در نانوایی'
                        : checkoutInfo.address?.fullAddress || '',
                deliveryMethod: checkoutInfo.deliveryMethod,
                deliveryPrice,
                deliveryDistance: checkoutInfo.deliveryDistance || 0,
                destinationLat:
                    checkoutInfo.deliveryMethod === 'DELIVERY'
                        ? checkoutInfo.address?.latitude
                        : null,
                destinationLng:
                    checkoutInfo.deliveryMethod === 'DELIVERY'
                        ? checkoutInfo.address?.longitude
                        : null,
                items: orderItems,
                totalPrice: totalPrice + deliveryPrice,
                status: 'PENDING',
            };

            if (checkoutInfo.tenantId) {
                orderData.tenantId = checkoutInfo.tenantId;
            }

            const response = await submitOrder(orderData);
            const createdOrder = response?.data || {};

            // خالی کردن سبد
            try {
                await clearCart();
            } catch (e) {
                console.warn('⚠️ خطا در خالی کردن سبد:', e);
            }

            // پاک کردن اطلاعات checkout
            localStorage.removeItem(CHECKOUT_KEY);

            window.dispatchEvent(new Event('cartUpdated'));
            showToast('سفارش با موفقیت ثبت شد', 'success');

            setTimeout(() => {
                navigate('/order-success', {
                    state: { order: createdOrder },
                });
            }, 500);
        } catch (err) {
            console.error('❌ خطا در ثبت سفارش:', err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                'خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    /* ============================================================
       رندر — بارگذاری
       ============================================================ */
    if (loading || !checkoutInfo) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    const deliveryPrice =
        checkoutInfo.deliveryMethod === 'DELIVERY'
            ? checkoutInfo.deliveryPrice || 0
            : 0;

    const finalPrice = totalPrice + deliveryPrice;

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="counter-cart-page">

            <PageTitle
                image="/sidebar-icons/cart.png"
                fallbackIcon="📝"
                title="تأیید نهایی سفارش"
                count={`${toPersianNumber(items.length)} قلم`}
            />

            {/* ===== آیتم‌های سفارش ===== */}
            <div className="cart-items-section">
                <div className="cart-section-header">
                    <h3>🛒 سفارش شما</h3>
                    <span className="items-count">
                        {toPersianNumber(items.length)} قلم
                    </span>
                </div>

                <div className="cart-items-list-large">
                    {items.map((item) => {
                        const pid = item.product?._id || item.product?.id;
                        const price = item.product?.price || 0;
                        const qty = item.quantity || 0;

                        return (
                            <div key={pid} className="cart-item-large">
                                <img
                                    src={item.product?.imageUrl || '/images/default-bread.png'}
                                    alt={item.product?.name}
                                    className="item-image"
                                    onError={(e) => {
                                        e.target.src = '/images/default-bread.png';
                                    }}
                                />
                                <div className="item-details">
                                    <h4>{item.product?.name}</h4>
                                    <span className="item-price">
                                        {formatPrice(price)} ریال
                                    </span>
                                </div>
                                <div className="item-controls">
                                    <span className="qty-display-large">
                                        × {toPersianNumber(qty)}
                                    </span>
                                </div>
                                <div className="item-total">
                                    {formatPrice(price * qty)} ریال
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ===== اطلاعات تحویل ===== */}
            <div className="delivery-section">
                <h3>🚚 اطلاعات تحویل</h3>

                <div className="summary-body" style={{ padding: '8px 0' }}>
                    <div className="summary-row">
                        <span>روش تحویل:</span>
                        <strong>
                            {checkoutInfo.deliveryMethod === 'PICKUP'
                                ? '📍 حضوری'
                                : '🛵 با پیک'}
                        </strong>
                    </div>

                    {checkoutInfo.deliveryMethod === 'DELIVERY' &&
                        checkoutInfo.address && (
                            <>
                                <div className="summary-row">
                                    <span>آدرس:</span>
                                    <strong
                                        style={{
                                            fontSize: '11.5px',
                                            textAlign: 'left',
                                            maxWidth: '60%',
                                        }}
                                    >
                                        {checkoutInfo.address.fullAddress}
                                    </strong>
                                </div>
                                {checkoutInfo.address.phone && (
                                    <div className="summary-row">
                                        <span>تماس:</span>
                                        <strong>
                                            {toPersianNumber(
                                                checkoutInfo.address.phone
                                            )}
                                        </strong>
                                    </div>
                                )}
                            </>
                        )}

                    {checkoutInfo.customerName && (
                        <div className="summary-row">
                            <span>نام مشتری:</span>
                            <strong>{checkoutInfo.customerName}</strong>
                        </div>
                    )}

                    {checkoutInfo.customerPhone && (
                        <div className="summary-row">
                            <span>شماره تماس:</span>
                            <strong>
                                {toPersianNumber(checkoutInfo.customerPhone)}
                            </strong>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== جمع نهایی ===== */}
            <div className="final-summary-box">
                <div className="final-summary-row">
                    <span>جمع کالاها:</span>
                    <span>{formatPrice(totalPrice)} ریال</span>
                </div>
                {deliveryPrice > 0 && (
                    <div className="final-summary-row delivery">
                        <span>🛵 هزینه پیک:</span>
                        <span>{formatPrice(deliveryPrice)} ریال</span>
                    </div>
                )}
                <div className="final-summary-row total">
                    <span>مبلغ قابل پرداخت:</span>
                    <strong>{formatPrice(finalPrice)} ریال</strong>
                </div>
            </div>

            {/* ===== دکمه‌ها ===== */}
            <div className="counter-cart-actions">
                <Link to="/delivery" className="btn-secondary-action">
                    ← بازگشت
                </Link>
                <button
                    className="btn-primary-action confirm"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting
                        ? '⏳ در حال ثبت...'
                        : '✅ تأیید و ثبت سفارش'}
                </button>
            </div>
        </div>
    );
}

export default CheckoutPage;