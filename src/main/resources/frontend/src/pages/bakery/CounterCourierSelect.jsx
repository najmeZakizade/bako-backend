// src/pages/bakery/CounterCourierSelect.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getCouriers,
    createOrder,
    assignCourierToOrder,
    calculateDelivery
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';

/* ============================================================
   🎯 کلیدهای localStorage — به‌ازای هر نانوایی (tenantId)
   ============================================================ */
const getTenantId = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.tenantId || user.bakeryId || null;
        }
    } catch (e) {
        console.error('خطا در دریافت tenantId:', e);
    }
    return null;
};

const getCartKey = () => {
    const tid = getTenantId();
    return tid ? `bako_counter_cart_${tid}` : 'bako_counter_cart_guest';
};

const getCheckoutKey = () => {
    const tid = getTenantId();
    return tid ? `bako_counter_checkout_${tid}` : 'bako_counter_checkout_guest';
};

const getLastOrderKey = () => {
    const tid = getTenantId();
    return tid ? `bako_last_order_${tid}` : 'bako_last_order_guest';
};

function CounterCourierSelect() {
    const navigate = useNavigate();
    const [couriers, setCouriers] = useState([]);
    const [selectedCourierId, setSelectedCourierId] = useState(null);
    const [checkout, setCheckout] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const extractErrorMessage = (err) => {
        const data = err.response?.data;

        if (!data) {
            return err.message || 'خطا در ارتباط با سرور';
        }

        if (data.errors) {
            if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
                const messages = Object.entries(data.errors).map(([field, msg]) => {
                    const fieldLabels = {
                        phone: 'شماره تلفن',
                        customerName: 'نام مشتری',
                        address: 'آدرس',
                        items: 'آیتم‌های سفارش',
                        totalPrice: 'مبلغ کل',
                        tenantId: 'شناسه نانوایی',
                        deliveryPrice: 'هزینه ارسال',
                    };
                    const label = fieldLabels[field] || field;
                    return `${label}: ${msg}`;
                });
                return messages.join(' • ');
            }
            if (Array.isArray(data.errors)) {
                return data.errors.map(e => e.message || e.defaultMessage || 'خطای اعتبارسنجی').join(' • ');
            }
        }

        if (data.message) {
            return data.message;
        }

        return 'خطای نامشخص';
    };

    useEffect(() => {
        try {
            const saved = localStorage.getItem(getCheckoutKey());
            if (saved) {
                const parsed = JSON.parse(saved);
                setCheckout(parsed);
            } else {
                showToast('اطلاعات سفارش یافت نشد', 'error');
                navigate('/bakery/counter');
            }
        } catch (e) {
            console.error('خطا در بارگذاری اطلاعات:', e);
            navigate('/bakery/counter');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchCouriers = async () => {
            try {
                setLoading(true);
                const res = await getCouriers();
                const data = res.data || [];
                const activeCouriers = data.filter(c => c.enabled !== false);
                setCouriers(activeCouriers);
            } catch (err) {
                console.error('خطا در دریافت پیک‌ها:', err);
                setError('خطا در دریافت لیست پیک‌ها');
                showToast('خطا در دریافت لیست پیک‌ها', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCouriers();
    }, []);

    const getTenantIdLocal = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.tenantId || user.bakeryId || null;
            }
        } catch (e) {
            console.error('❌ خطا در دریافت tenantId:', e);
        }
        return null;
    };

    const getVehicleLabel = (type) => {
        const map = {
            'MOTORCYCLE': '🏍️ موتورسیکلت',
            'CAR': '🚗 خودرو',
            'BICYCLE': '🚲 دوچرخه',
        };
        return map[type] || type;
    };

    const handleSubmit = async () => {
        if (!checkout) {
            showToast('اطلاعات سفارش ناقص است', 'error');
            return;
        }

        const tenantId = getTenantIdLocal();
        if (!tenantId) {
            showToast('خطا در شناسایی نانوایی', 'error');
            return;
        }

        if (checkout.deliveryMethod === 'DELIVERY' && !selectedCourierId) {
            showToast('لطفاً یک پیک انتخاب کنید', 'error');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const orderItems = checkout.items.map(item => ({
                productId: String(item.productId),
                productName: String(item.name),      // 🎯 هماهنگ با CartItem.java
                productPrice: Number(item.price),    // 🎯 هماهنگ با CartItem.java
                productImageUrl: item.imageUrl || null,
                quantity: Number(item.quantity),
            }));

            let deliveryPrice = checkout.deliveryPrice || 0;
            let deliveryDistance = checkout.deliveryDistance || 0;

            if (checkout.deliveryMethod === 'DELIVERY'
                && checkout.destinationLat && checkout.destinationLng) {
                try {
                    const calcRes = await calculateDelivery({
                        destLat: checkout.destinationLat,
                        destLng: checkout.destinationLng,
                        orderTotal: checkout.totalPrice,
                    });
                    const deliveryInfo = calcRes?.data || null;

                    if (deliveryInfo && !deliveryInfo.error) {
                        deliveryPrice = deliveryInfo.price ?? deliveryPrice;
                        deliveryDistance = Math.round(deliveryInfo.distance ?? deliveryDistance);
                    }
                } catch (calcErr) {
                    console.warn('⚠️ محاسبه مجدد هزینه ارسال ناموفق بود.');
                }
            }

            const orderData = {
                customerName: checkout.customerName,
                phone: checkout.customerPhone,
                address: checkout.deliveryAddress,
                deliveryMethod: checkout.deliveryMethod,
                deliveryPrice: deliveryPrice,
                deliveryDistance: deliveryDistance,
                destinationLat: checkout.destinationLat || null,
                destinationLng: checkout.destinationLng || null,
                items: orderItems,
                totalPrice: checkout.totalPrice,
                status: 'PENDING',
                tenantId: tenantId,
            };

            const response = await createOrder(orderData);
            const createdOrder = response?.data || {};
            const createdOrderId = createdOrder.id || createdOrder._id;

            if (!createdOrderId) {
                throw new Error('شناسه سفارش از سرور دریافت نشد.');
            }

            let finalOrderData = { ...orderData };

            if (checkout.deliveryMethod === 'DELIVERY' && selectedCourierId) {
                try {
                    const assignRes = await assignCourierToOrder(
                        createdOrderId,
                        selectedCourierId,
                        tenantId
                    );
                    const assignedOrder = assignRes?.data || {};

                    finalOrderData = {
                        ...finalOrderData,
                        courierId: assignedOrder.courierId || selectedCourierId,
                        courierName: assignedOrder.courierName || null,
                        courierPhone: assignedOrder.courierPhone || null,
                        courierVehicleType: assignedOrder.courierVehicleType || null,
                        courierVehiclePlate: assignedOrder.courierVehiclePlate || null,
                        deliveryPrice: assignedOrder.deliveryPrice ?? deliveryPrice,
                        courierCommission: assignedOrder.courierCommission ?? null,
                        courierPayout: assignedOrder.courierPayout ?? null,
                        status: assignedOrder.status || 'PREPARING',
                    };

                    showToast('سفارش ثبت و پیک تخصیص یافت', 'success');
                } catch (assignErr) {
                    console.error('❌ خطا در تخصیص پیک:', assignErr);
                    const msg = extractErrorMessage(assignErr);
                    setError(msg);
                    showToast(msg, 'error');
                    setSubmitting(false);
                    return;
                }
            } else {
                showToast('سفارش با موفقیت ثبت شد', 'success');
            }

            const receiptData = {
                ...finalOrderData,
                _id: createdOrderId,
                id: createdOrderId,
                orderDate: createdOrder.orderDate || new Date().toISOString(),
                createdAt: createdOrder.createdAt || new Date().toISOString(),
            };
            localStorage.setItem(getLastOrderKey(), JSON.stringify(receiptData));

            localStorage.removeItem(getCartKey());
            localStorage.removeItem(getCheckoutKey());
            window.dispatchEvent(new Event('cartUpdated'));

            // 🎯 برو به payment
            setTimeout(() => navigate('/bakery/counter/payment'), 800);
        } catch (err) {
            console.error('❌ خطا در ثبت سفارش:', err);
            const msg = extractErrorMessage(err);
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری پیک‌ها...</p>
            </div>
        );
    }

    return (
        <div className="counter-courier-page">

            {/* ===== خلاصه سفارش ===== */}
            <div className="order-summary-box">
                <div className="summary-header">
                    <h3>📋 خلاصه سفارش</h3>
                </div>
                <div className="summary-body">
                    <div className="summary-row">
                        <span>مشتری:</span>
                        <strong>{checkout?.customerName || '—'}</strong>
                    </div>
                    <div className="summary-row">
                        <span>شماره تماس:</span>
                        <strong>{toPersianNumber(checkout?.customerPhone || '')}</strong>
                    </div>
                    <div className="summary-row">
                        <span>روش تحویل:</span>
                        <strong>
                            {checkout?.deliveryMethod === 'PICKUP' ? '📍 حضوری' : '🛵 با پیک'}
                        </strong>
                    </div>
                    {checkout?.deliveryMethod === 'DELIVERY' && (
                        <div className="summary-row">
                            <span>آدرس:</span>
                            <strong style={{ fontSize: '11.5px', textAlign: 'left', maxWidth: '60%' }}>
                                {checkout?.deliveryAddress}
                            </strong>
                        </div>
                    )}
                    <div className="summary-row">
                        <span>جمع کالاها:</span>
                        <strong>{formatPrice(checkout?.totalPrice || 0)} ریال</strong>
                    </div>
                    {checkout?.deliveryMethod === 'DELIVERY' && checkout?.deliveryPrice > 0 && (
                        <div className="summary-row delivery">
                            <span>🛵 هزینه پیک:</span>
                            <strong>{formatPrice(checkout?.deliveryPrice || 0)} ریال</strong>
                        </div>
                    )}
                    <div className="summary-row total">
                        <span>مبلغ کل:</span>
                        <strong>{formatPrice(checkout?.finalPrice || checkout?.totalPrice || 0)} ریال</strong>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-box" style={{
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '10px 14px',
                    borderRadius: '7px',
                    borderRight: '4px solid #dc3545',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                }}>
                    ⚠️ {error}
                </div>
            )}

            {checkout?.deliveryMethod === 'DELIVERY' ? (
                <>
                    <div className="section-header">
                        <h2>🛵 انتخاب پیک برای این سفارش</h2>
                    </div>

                    {couriers.length === 0 ? (
                        <div className="empty-couriers">
                            <span className="empty-icon">🛵</span>
                            <p>هیچ پیک فعالی ثبت نشده است.</p>
                            <button className="btn-back-shop" onClick={() => navigate('/bakery/couriers')}>
                                ➕ افزودن پیک جدید
                            </button>
                        </div>
                    ) : (
                        <div className="couriers-selection-grid">
                            {couriers.map((courier) => {
                                const courierId = courier.id || courier._id;
                                const isSelected = String(selectedCourierId) === String(courierId);
                                return (
                                    <button
                                        key={courierId}
                                        type="button"
                                        className={`courier-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedCourierId(courierId)}
                                    >
                                        <div className="courier-avatar">👤</div>
                                        <div className="courier-info">
                                            <h4>{courier.fullName || 'نامشخص'}</h4>
                                            <span className="courier-phone">
                                                📞 {toPersianNumber(courier.phone || '—')}
                                            </span>
                                            <span className="courier-vehicle">
                                                {getVehicleLabel(courier.vehicleType)}
                                                {courier.vehiclePlate && ` · ${toPersianNumber(courier.vehiclePlate)}`}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span className="selected-check">✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className="no-courier-needed">
                    <span className="info-icon">ℹ️</span>
                    <p>این سفارش حضوری است و نیازی به انتخاب پیک ندارد.</p>
                </div>
            )}

            <div className="counter-cart-actions">
                <button className="btn-secondary-action" onClick={() => navigate('/bakery/counter/cart')}>
                    ← بازگشت
                </button>
                <button
                    className="btn-primary-action confirm"
                    onClick={handleSubmit}
                    disabled={submitting || (checkout?.deliveryMethod === 'DELIVERY' && !selectedCourierId)}
                >
                    {submitting ? '⏳ در حال ثبت...' : '✅ تأیید و ادامه به پرداخت'}
                </button>
            </div>
        </div>
    );
}

export default CounterCourierSelect;