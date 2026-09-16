// src/pages/bakery/PaymentMethod.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import { requestOnlinePayment } from '../../services/api';

const LAST_ORDER_KEY = 'bako_last_order';
const PAYMENT_METHOD_KEY = 'bako_payment_method';

function PaymentMethod() {
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LAST_ORDER_KEY);
            if (saved) {
                setOrder(JSON.parse(saved));
            } else {
                showToast('اطلاعات سفارش یافت نشد', 'error');
                navigate('/bakery/counter');
            }
        } catch (e) {
            console.error('خطا در بارگذاری سفارش:', e);
            navigate('/bakery/counter');
        }
    }, [navigate]);

    const handleConfirm = async () => {
        if (!selected) {
            showToast('لطفاً یک روش پرداخت انتخاب کنید', 'error');
            return;
        }

        try {
            localStorage.setItem(PAYMENT_METHOD_KEY, selected);

            // آپدیت سفارش با روش پرداخت
            const updatedOrder = {
                ...order,
                paymentMethod: selected,
                paymentStatus:
                    selected === 'GATEWAY' ? 'PENDING' : 'PAID',
            };
            localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(updatedOrder));
        } catch (e) {
            console.error('خطا در ذخیره روش پرداخت:', e);
        }

        // نقدی یا کارتخوان → مستقیم برو به فاکتور
        if (selected === 'CASH' || selected === 'POS') {
            navigate('/bakery/counter/receipt');
            return;
        }

        // درگاه پرداخت آنلاین
        setLoading(true);
        try {
            const orderId = order._id || order.id;
            const amount = order.finalPrice || order.totalPrice || 0;

            const response = await requestOnlinePayment(orderId, amount);
            const data = response?.data || {};

            if (data.paymentUrl) {
                // ذخیره authority برای verify در بازگشت
                if (data.authority) {
                    localStorage.setItem('bako_payment_authority', data.authority);
                }
                // ریدایرکت به درگاه
                window.location.href = data.paymentUrl;
            } else {
                throw new Error(data.message || 'لینک پرداخت دریافت نشد');
            }
        } catch (err) {
            console.error('❌ خطا در درخواست پرداخت:', err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                'خطا در اتصال به درگاه پرداخت';
            showToast(msg, 'error');
            setLoading(false);
        }
    };

    if (!order) return null;

    const totalPrice =
        order.finalPrice || (order.totalPrice + (order.deliveryPrice || 0));

    return (
        <div className="payment-page">
            {/* ===== خلاصه سفارش ===== */}
            <div className="payment-summary-box">
                <h3>📋 خلاصه پرداخت</h3>
                <div className="payment-summary-row">
                    <span>مشتری:</span>
                    <strong>{order.customerName || '—'}</strong>
                </div>
                <div className="payment-summary-row">
                    <span>شماره فاکتور:</span>
                    <strong>
                        #{String(order._id || order.id || '').slice(-6)}
                    </strong>
                </div>
                {order.deliveryMethod === 'DELIVERY' && order.deliveryPrice > 0 && (
                    <div className="payment-summary-row">
                        <span>هزینه پیک:</span>
                        <strong>{formatPrice(order.deliveryPrice)} ریال</strong>
                    </div>
                )}
                <div className="payment-summary-row total">
                    <span>مبلغ قابل پرداخت:</span>
                    <strong>{formatPrice(totalPrice)} ریال</strong>
                </div>
            </div>

            {/* ===== انتخاب روش پرداخت ===== */}
            <div className="payment-methods-box">
                <h3>💳 روش پرداخت را انتخاب کنید</h3>

                <div className="payment-methods-grid">
                    <button
                        type="button"
                        className={`payment-method-card ${
                            selected === 'CASH' ? 'selected' : ''
                        }`}
                        onClick={() => setSelected('CASH')}
                    >
                        <span className="payment-icon">💵</span>
                        <span className="payment-title">پرداخت نقدی</span>
                        <span className="payment-desc">
                            پرداخت با اسکناس در محل
                        </span>
                        {selected === 'CASH' && (
                            <span className="selected-check">✓</span>
                        )}
                    </button>

                    <button
                        type="button"
                        className={`payment-method-card ${
                            selected === 'POS' ? 'selected' : ''
                        }`}
                        onClick={() => setSelected('POS')}
                    >
                        <span className="payment-icon">💳</span>
                        <span className="payment-title">کارتخوان حضوری</span>
                        <span className="payment-desc">
                            پرداخت با کارت بانکی
                        </span>
                        {selected === 'POS' && (
                            <span className="selected-check">✓</span>
                        )}
                    </button>

                    <button
                        type="button"
                        className={`payment-method-card ${
                            selected === 'GATEWAY' ? 'selected' : ''
                        }`}
                        onClick={() => setSelected('GATEWAY')}
                    >
                        <span className="payment-icon">🌐</span>
                        <span className="payment-title">درگاه آنلاین</span>
                        <span className="payment-desc">
                            پرداخت از طریق اینترنت
                        </span>
                        {selected === 'GATEWAY' && (
                            <span className="selected-check">✓</span>
                        )}
                    </button>
                </div>
            </div>

            {/* ===== دکمه‌های عملیات ===== */}
            <div className="payment-actions">
                <button
                    className="btn-secondary-action"
                    onClick={() => navigate('/bakery/counter/courier')}
                    disabled={loading}
                >
                    ← بازگشت
                </button>
                <button
                    className="btn-primary-action confirm"
                    onClick={handleConfirm}
                    disabled={!selected || loading}
                >
                    {loading
                        ? '⏳ در حال اتصال به درگاه...'
                        : selected === 'GATEWAY'
                            ? '🌐 پرداخت آنلاین'
                            : '✅ تأیید و چاپ فاکتور'}
                </button>
            </div>
        </div>
    );
}

export default PaymentMethod;