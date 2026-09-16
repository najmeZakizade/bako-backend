// src/pages/bakery/PaymentCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import { verifyOnlinePayment } from '../../services/api';

const LAST_ORDER_KEY = 'bako_last_order';

function PaymentCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying');
    const [refId, setRefId] = useState('');

    useEffect(() => {
        const verify = async () => {
            // پارامترهای بازگشتی از درگاه زرین‌پال
            const authority =
                searchParams.get('Authority') ||
                searchParams.get('authority') ||
                localStorage.getItem('bako_payment_authority');

            const gatewayStatus =
                searchParams.get('Status') || searchParams.get('status') || 'OK';

            try {
                const orderStr = localStorage.getItem(LAST_ORDER_KEY);
                if (!orderStr) {
                    setStatus('failed');
                    return;
                }
                const order = JSON.parse(orderStr);
                const orderId = order._id || order.id;

                if (!orderId) {
                    setStatus('failed');
                    return;
                }

                const response = await verifyOnlinePayment(orderId, {
                    authority,
                    status: gatewayStatus,
                });
                const data = response?.data || {};

                if (data.success) {
                    const updated = {
                        ...order,
                        paymentMethod: 'GATEWAY',
                        paymentStatus: 'PAID',
                        paymentRefId: data.refId || '',
                        paidAt: new Date().toISOString(),
                    };
                    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(updated));
                    localStorage.removeItem('bako_payment_authority');
                    setRefId(data.refId || '');
                    setStatus('success');
                    showToast('پرداخت با موفقیت انجام شد', 'success');
                    setTimeout(() => navigate('/bakery/counter/receipt'), 1500);
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
                        در صورت کسر مبلغ از حساب، طی ۷۲ ساعت آینده بازگردانده
                        می‌شود.
                    </p>
                    <div className="callback-actions">
                        <button
                            className="btn-primary-action"
                            onClick={() => navigate('/bakery/counter/payment')}
                        >
                            🔄 تلاش مجدد
                        </button>
                        <button
                            className="btn-secondary-action"
                            onClick={() => navigate('/bakery/counter')}
                        >
                            بازگشت به صندوق
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PaymentCallback;