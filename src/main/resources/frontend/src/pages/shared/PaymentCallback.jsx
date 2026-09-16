// src/pages/shared/PaymentCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import { verifyOnlinePayment, clearCart } from '../../services/api';

const PENDING_ORDER_KEY = 'bako_customer_pending_order';
const RECEIPT_ORDER_KEY = 'bako_customer_receipt_order';
const LAST_ORDER_KEY = 'bako_last_order';

function PaymentCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying');
    const [refId, setRefId] = useState('');

    useEffect(() => {
        const verify = async () => {
            const authority =
                searchParams.get('Authority') ||
                searchParams.get('authority') ||
                localStorage.getItem('bako_customer_payment_authority') ||
                localStorage.getItem('bako_payment_authority');

            const gatewayStatus =
                searchParams.get('Status') ||
                searchParams.get('status') ||
                'OK';

            const orderIdFromUrl = searchParams.get('orderId');

            // ===== تشخیص نوع کاربر =====
            let userRole = null;
            try {
                const userStr = localStorage.getItem('user');
                const user = userStr ? JSON.parse(userStr) : null;
                userRole = user?.role;
            } catch {
                userRole = null;
            }

            const isCustomer = userRole === 'CUSTOMER';

            // ===== پیدا کردن orderId =====
            let orderId = orderIdFromUrl;
            let pendingData = null;

            if (!orderId) {
                try {
                    const pendingStr = localStorage.getItem(PENDING_ORDER_KEY);
                    if (pendingStr) {
                        pendingData = JSON.parse(pendingStr);
                        orderId = pendingData.orderId;
                    }
                } catch {
                    // ignore
                }
            }

            if (!orderId && !isCustomer) {
                try {
                    const orderStr = localStorage.getItem(LAST_ORDER_KEY);
                    if (orderStr) {
                        const order = JSON.parse(orderStr);
                        orderId = order._id || order.id;
                    }
                } catch {
                    // ignore
                }
            }

            if (!orderId) {
                setStatus('failed');
                showToast('شناسه سفارش یافت نشد', 'error');
                return;
            }

            try {
                const response = await verifyOnlinePayment(orderId, {
                    authority,
                    status: gatewayStatus,
                });
                const data = response?.data || {};

                if (data.success) {
                    setRefId(data.refId || '');

                    // ===== مشتری =====
                    if (isCustomer) {
                        // خالی کردن سبد
                        try {
                            await clearCart();
                        } catch (e) {
                            console.warn('⚠️ خطا در خالی کردن سبد:', e);
                        }

                        // 🎯 ساخت سفارش برای فاکتور
                        const orderData = pendingData?.orderData || {};
                        const receiptOrder = {
                            ...orderData,
                            _id: orderId,
                            id: orderId,
                            paymentMethod: 'GATEWAY',
                            paymentStatus: 'PAID',
                            paymentRefId: data.refId || '',
                            paidAt: new Date().toISOString(),
                            orderDate: new Date().toISOString(),
                            finalPrice:
                                orderData.finalPrice ||
                                (orderData.totalPrice || 0) +
                                (orderData.deliveryPrice || 0),
                        };
                        localStorage.setItem(
                            RECEIPT_ORDER_KEY,
                            JSON.stringify(receiptOrder)
                        );

                        // پاک کردن کلیدهای موقت
                        localStorage.removeItem(PENDING_ORDER_KEY);
                        localStorage.removeItem(
                            'bako_customer_payment_authority'
                        );
                        localStorage.removeItem('bako_customer_checkout');

                        window.dispatchEvent(new Event('cartUpdated'));

                        setStatus('success');
                        showToast('پرداخت با موفقیت انجام شد', 'success');

                        setTimeout(() => {
                            navigate('/receipt');
                        }, 1500);
                        return;
                    }

                    // ===== پنل نانوایی =====
                    try {
                        const orderStr = localStorage.getItem(LAST_ORDER_KEY);
                        if (orderStr) {
                            const order = JSON.parse(orderStr);
                            const updated = {
                                ...order,
                                paymentMethod: 'GATEWAY',
                                paymentStatus: 'PAID',
                                paymentRefId: data.refId || '',
                                paidAt: new Date().toISOString(),
                            };
                            localStorage.setItem(
                                LAST_ORDER_KEY,
                                JSON.stringify(updated)
                            );
                        }
                    } catch {
                        // ignore
                    }
                    localStorage.removeItem('bako_payment_authority');

                    setStatus('success');
                    showToast('پرداخت با موفقیت انجام شد', 'success');

                    setTimeout(() => {
                        navigate('/bakery/counter/receipt');
                    }, 1500);
                } else {
                    setStatus('failed');
                    showToast(data.message || 'پرداخت ناموفق بود', 'error');
                }
            } catch (err) {
                console.error('❌ خطا در تأیید پرداخت:', err);
                setStatus('failed');
                showToast('خطا در تأیید پرداخت', 'error');
            }
        };

        verify();
    }, [navigate, searchParams]);

    /* ============================================================
       رندر
       ============================================================ */
    const handleBack = () => {
        let userRole = null;
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            userRole = user?.role;
        } catch {
            // ignore
        }

        if (userRole === 'CUSTOMER') {
            navigate('/payment');
        } else {
            navigate('/bakery/counter/payment');
        }
    };

    return (
        <div className="payment-callback-page">
            {status === 'verifying' && (
                <div className="callback-content">
                    <div className="spinner"></div>
                    <h2>⏳ در حال تأیید پرداخت</h2>
                    <p>لطفاً صفحه را نبندید...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="callback-content">
                    <span className="callback-icon success">✅</span>
                    <h2>پرداخت با موفقیت انجام شد</h2>
                    {refId && (
                        <p className="ref-id">
                            کد پیگیری: <strong>{refId}</strong>
                        </p>
                    )}
                    <p>در حال انتقال به فاکتور...</p>
                </div>
            )}

            {status === 'failed' && (
                <div className="callback-content">
                    <span className="callback-icon failed">❌</span>
                    <h2>پرداخت ناموفق بود</h2>
                    <p>
                        در صورت کسر مبلغ از حساب، طی ۷۲ ساعت آینده
                        بازگردانده می‌شود.
                    </p>
                    <div className="callback-actions">
                        <button
                            className="btn-primary-action"
                            onClick={handleBack}
                        >
                            🔄 تلاش مجدد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PaymentCallback;