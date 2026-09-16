// src/pages/customer/PaymentPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getCartItems,
    getTenantPaymentMethods,
    submitOrder,
    requestOnlinePayment,
    updatePaymentMethod,
    clearCart,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import '../../styles/customer-payment.css';

const CHECKOUT_KEY = 'bako_customer_checkout';
const PENDING_ORDER_KEY = 'bako_customer_pending_order';
const RECEIPT_ORDER_KEY = 'bako_customer_receipt_order';

function PaymentPage() {
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState(0);
    const [checkoutInfo, setCheckoutInfo] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState(null);
    const [selected, setSelected] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    /* ============================================================
       بارگذاری اولیه
       ============================================================ */
    useEffect(() => {
        let checkoutData = null;
        try {
            const raw = localStorage.getItem(CHECKOUT_KEY);
            checkoutData = raw ? JSON.parse(raw) : null;
            setCheckoutInfo(checkoutData);
        } catch (e) {
            console.error('خطا در خواندن اطلاعات تحویل:', e);
        }

        if (!checkoutData) {
            showToast('لطفاً ابتدا روش تحویل را انتخاب کنید', 'error');
            navigate('/delivery');
            return;
        }

        if (!checkoutData.tenantId) {
            showToast('شناسه نانوایی یافت نشد', 'error');
            navigate('/delivery');
            return;
        }

        const fetchData = async () => {
            try {
                const cartRes = await getCartItems();
                const cartData = cartRes.data || [];
                setItems(cartData);

                let total = 0;
                cartData.forEach((item) => {
                    total += (item.product?.price || 0) * (item.quantity || 0);
                });
                setTotalPrice(total);

                if (cartData.length === 0) {
                    navigate('/cart');
                    return;
                }

                const methodsRes = await getTenantPaymentMethods(
                    checkoutData.tenantId
                );
                const methods = methodsRes.data || {};
                setPaymentMethods(methods);

                const activeMethods = [];
                if (methods.cash) activeMethods.push('CASH');
                if (methods.pos) activeMethods.push('POS');
                if (methods.online) activeMethods.push('GATEWAY');

                if (activeMethods.length === 1) {
                    setSelected(activeMethods[0]);
                }
            } catch (err) {
                console.error('❌ خطا در بارگذاری:', err);
                showToast('خطا در بارگذاری اطلاعات', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    /* ============================================================
       ثبت سفارش و پرداخت
       ============================================================ */
    const handleConfirm = async () => {
        if (!selected) {
            showToast('لطفاً یک روش پرداخت انتخاب کنید', 'error');
            return;
        }

        setSubmitting(true);

        try {
            /* ============================================================
               🎯 ساخت orderItems مطابق CartItem.java
               فیلدها:
                 - productId
                 - productName   (نه name)
                 - productPrice  (نه price)
                 - productImageUrl
                 - quantity
               ============================================================ */
            const orderItems = items.map((item) => ({
                productId: String(item.product?._id || item.product?.id),
                productName: String(item.product?.name || ''),
                productPrice: Number(item.product?.price || 0),
                productImageUrl: item.product?.imageUrl || null,
                quantity: Number(item.quantity || 0),
            }));

            const deliveryPrice =
                checkoutInfo.deliveryMethod === 'DELIVERY'
                    ? checkoutInfo.deliveryPrice || 0
                    : 0;

            const finalPrice = totalPrice + deliveryPrice;

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
                totalPrice, // فقط محصولات (بدون پیک)
                status: 'PENDING',
                tenantId: checkoutInfo.tenantId,
            };

            const orderRes = await submitOrder(orderData);
            const createdOrder = orderRes?.data || {};
            const orderId = createdOrder.id || createdOrder._id;

            if (!orderId) {
                throw new Error('شناسه سفارش از سرور دریافت نشد');
            }

            /* ============================================================
               نقدی یا کارتخوان → فاکتور
               ============================================================ */
            if (selected === 'CASH' || selected === 'POS') {
                await updatePaymentMethod(orderId, selected);

                try {
                    await clearCart();
                } catch (e) {
                    console.warn('⚠️ خطا در خالی کردن سبد:', e);
                }

                /* ============================================================
                   🎯 ساخت سفارش برای صفحه فاکتور
                   - عیناً همون ساختاری که در Receipt انتظار داره
                   - items با productName و productPrice
                   ============================================================ */
                const receiptOrder = {
                    ...createdOrder,
                    ...orderData,
                    _id: orderId,
                    id: orderId,
                    items: orderItems, // 🎯 فیلدهای درست
                    paymentMethod: selected,
                    paymentStatus: 'PAID',
                    paidAt: new Date().toISOString(),
                    orderDate:
                        createdOrder.orderDate || new Date().toISOString(),
                    finalPrice,
                };

                localStorage.setItem(
                    RECEIPT_ORDER_KEY,
                    JSON.stringify(receiptOrder)
                );

                localStorage.removeItem(CHECKOUT_KEY);
                window.dispatchEvent(new Event('cartUpdated'));

                showToast('سفارش ثبت شد', 'success');

                setTimeout(() => {
                    navigate('/receipt');
                }, 400);
                return;
            }

            /* ============================================================
               پرداخت آنلاین → درگاه
               ============================================================ */
            if (selected === 'GATEWAY') {
                /* ============================================================
                   ذخیره اطلاعات برای callback
                   - orderData عیناً برای فاکتور استفاده می‌شه
                   - items با productName و productPrice
                   ============================================================ */
                localStorage.setItem(
                    PENDING_ORDER_KEY,
                    JSON.stringify({
                        orderId,
                        createdAt: new Date().toISOString(),
                        orderData: {
                            ...orderData,
                            items: orderItems, // 🎯 فیلدهای درست
                            finalPrice,
                        },
                    })
                );

                const payRes = await requestOnlinePayment(orderId, finalPrice);
                const payData = payRes?.data || {};

                if (!payData.success || !payData.paymentUrl) {
                    throw new Error(
                        payData.message || 'لینک پرداخت دریافت نشد'
                    );
                }

                if (payData.authority) {
                    localStorage.setItem(
                        'bako_customer_payment_authority',
                        payData.authority
                    );
                }

                showToast('در حال انتقال به درگاه پرداخت...', 'success');
                setTimeout(() => {
                    window.location.href = payData.paymentUrl;
                }, 400);
                return;
            }
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

    /* ============================================================
       رندر — هیچ روش پرداختی فعال نیست
       ============================================================ */
    const anyMethodActive =
        paymentMethods?.cash ||
        paymentMethods?.pos ||
        paymentMethods?.online;

    if (!anyMethodActive) {
        return (
            <div className="payment-page">
                <div className="payment-empty">
                    <span className="empty-icon">😔</span>
                    <h2>روش پرداخت فعالی وجود ندارد</h2>
                    <p>
                        این نانوایی در حال حاضر هیچ روش پرداختی رو فعال
                        نکرده است. لطفاً بعداً دوباره تلاش کنید یا با
                        نانوایی تماس بگیرید.
                    </p>
                    <Link to="/delivery" className="btn-secondary-action">
                        ← بازگشت
                    </Link>
                </div>
            </div>
        );
    }

    /* ============================================================
       رندر — اصلی
       ============================================================ */
    const deliveryPrice =
        checkoutInfo.deliveryMethod === 'DELIVERY'
            ? checkoutInfo.deliveryPrice || 0
            : 0;
    const finalPrice = totalPrice + deliveryPrice;

    return (
        <div className="payment-page">

            <PageTitle
                image="/sidebar-icons/cart.png"
                fallbackIcon="💳"
                title="پرداخت سفارش"
                count={`${toPersianNumber(items.length)} قلم`}
            />

            {/* ===== خلاصه سفارش ===== */}
            <div className="payment-summary-box">
                <h3>📋 خلاصه پرداخت</h3>

                <div className="payment-summary-row">
                    <span>تعداد اقلام:</span>
                    <strong>{toPersianNumber(items.length)} قلم</strong>
                </div>

                <div className="payment-summary-row">
                    <span>روش تحویل:</span>
                    <strong>
                        {checkoutInfo.deliveryMethod === 'PICKUP'
                            ? '📍 حضوری'
                            : '🛵 با پیک'}
                    </strong>
                </div>

                {checkoutInfo.deliveryMethod === 'DELIVERY' &&
                    checkoutInfo.address && (
                        <div className="payment-summary-row">
                            <span>آدرس:</span>
                            <strong
                                style={{
                                    fontSize: '11px',
                                    textAlign: 'left',
                                    maxWidth: '60%',
                                }}
                            >
                                {checkoutInfo.address.fullAddress}
                            </strong>
                        </div>
                    )}

                <div className="payment-summary-row">
                    <span>جمع کالاها:</span>
                    <strong>{formatPrice(totalPrice)} ریال</strong>
                </div>

                {deliveryPrice > 0 && (
                    <div className="payment-summary-row">
                        <span>هزینه پیک:</span>
                        <strong>{formatPrice(deliveryPrice)} ریال</strong>
                    </div>
                )}

                <div className="payment-summary-row total">
                    <span>مبلغ قابل پرداخت:</span>
                    <strong>{formatPrice(finalPrice)} ریال</strong>
                </div>
            </div>

            {/* ===== روش پرداخت ===== */}
            <div className="payment-methods-box">
                <h3>💳 روش پرداخت را انتخاب کنید</h3>

                <div className="payment-methods-grid">
                    {paymentMethods.cash && (
                        <button
                            type="button"
                            className={`payment-method-card ${
                                selected === 'CASH' ? 'selected' : ''
                            }`}
                            onClick={() => setSelected('CASH')}
                        >
                            <span className="payment-icon">💵</span>
                            <span className="payment-title">
                                پرداخت نقدی
                            </span>
                            <span className="payment-desc">
                                پرداخت با اسکناس در محل تحویل
                            </span>
                            {selected === 'CASH' && (
                                <span className="selected-check">✓</span>
                            )}
                        </button>
                    )}

                    {paymentMethods.pos && (
                        <button
                            type="button"
                            className={`payment-method-card ${
                                selected === 'POS' ? 'selected' : ''
                            }`}
                            onClick={() => setSelected('POS')}
                        >
                            <span className="payment-icon">💳</span>
                            <span className="payment-title">کارتخوان</span>
                            <span className="payment-desc">
                                پرداخت با کارت بانکی هنگام تحویل
                            </span>
                            {selected === 'POS' && (
                                <span className="selected-check">✓</span>
                            )}
                        </button>
                    )}

                    {paymentMethods.online && (
                        <button
                            type="button"
                            className={`payment-method-card ${
                                selected === 'GATEWAY' ? 'selected' : ''
                            }`}
                            onClick={() => setSelected('GATEWAY')}
                        >
                            <span className="payment-icon">🌐</span>
                            <span className="payment-title">
                                پرداخت آنلاین
                            </span>
                            <span className="payment-desc">
                                پرداخت امن از طریق درگاه بانکی
                            </span>
                            {selected === 'GATEWAY' && (
                                <span className="selected-check">✓</span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ===== دکمه‌ها ===== */}
            <div className="payment-actions">
                <Link to="/delivery" className="btn-secondary-action">
                    ← بازگشت
                </Link>
                <button
                    className="btn-primary-action confirm"
                    onClick={handleConfirm}
                    disabled={!selected || submitting}
                >
                    {submitting
                        ? '⏳ در حال ثبت...'
                        : selected === 'GATEWAY'
                            ? '🌐 پرداخت آنلاین'
                            : '✅ ثبت سفارش و صدور فاکتور'}
                </button>
            </div>
        </div>
    );
}

export default PaymentPage;