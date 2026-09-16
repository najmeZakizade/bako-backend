// src/pages/customer/OrderSuccessPage.jsx
import { Link, useLocation } from 'react-router-dom';
import { toPersianNumber } from '../../utils/format';

function OrderSuccessPage() {
    const location = useLocation();
    const order = location.state?.order;

    if (!order) {
        return (
            <div className="success-container">
                <span className="icon">❌</span>
                <h1>سفارشی یافت نشد</h1>
                <p>لطفاً دوباره تلاش کنید.</p>
                <Link to="/" className="btn-back-shop">
                    🏠 بازگشت به فروشگاه
                </Link>
            </div>
        );
    }

    const orderId = order._id || order.id;

    return (
        <div className="success-container">
            <span className="icon">✅</span>
            <h1>سفارش شما ثبت شد!</h1>
            <p>
                سفارش شما با موفقیت ثبت شد و در اسرع وقت برای ارسال
                اقدام می‌شود.
            </p>

            {orderId && (
                <div className="order-id">
                    شماره سفارش:{' '}
                    <span>
                        #{toPersianNumber(String(orderId).slice(-6))}
                    </span>
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginTop: '14px',
                }}
            >
                <Link to="/my-orders" className="btn-back-shop">
                    📦 سفارش‌های من
                </Link>
                <Link to="/" className="btn-back-shop">
                    🏠 بازگشت به صفحه اصلی
                </Link>
            </div>
        </div>
    );
}

export default OrderSuccessPage;