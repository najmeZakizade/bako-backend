// src/pages/bakery/CounterCart.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice, toEnglishNumber } from '../../utils/format';
import { calculateDelivery } from '../../services/api';
import MapPicker from '../../components/map/MapPicker';

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

const getTariffKey = () => {
    const tid = getTenantId();
    return tid ? `bako_courier_tariff_${tid}` : 'bako_courier_tariff_guest';
};

function CounterCart() {
    const navigate = useNavigate();
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('PICKUP');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [customerCoords, setCustomerCoords] = useState(null);
    const [deliveryPrice, setDeliveryPrice] = useState(0);
    const [deliveryDistance, setDeliveryDistance] = useState(0);
    const [calculating, setCalculating] = useState(false);

    // 🎯 خطاهای فیلدها (برای نمایش زیر هر input)
    const [fieldErrors, setFieldErrors] = useState({
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        coords: '',
    });

    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(getCartKey());
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('خطا در بارگذاری سبد:', e);
        }
        return [];
    });

    useEffect(() => {
        try {
            localStorage.setItem(getCartKey(), JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (e) {
            console.error('خطا در ذخیره سبد:', e);
        }
    }, [cart]);

    // پاک کردن خطای هر فیلد وقتی کاربر تایپ میکنه
    const clearFieldError = (fieldName) => {
        setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty <= 0) {
            removeItem(productId);
            return;
        }
        setCart(prev => prev.map(item =>
            String(item.productId) === String(productId)
                ? { ...item, quantity: newQty }
                : item
        ));
    };

    const removeItem = (productId) => {
        setCart(prev => prev.filter(item => String(item.productId) !== String(productId)));
    };

    const clearCart = () => {
        if (window.confirm('آیا از پاک کردن کل سبد مطمئن هستید؟')) {
            setCart([]);
            localStorage.removeItem(getCartKey());
            window.dispatchEvent(new Event('cartUpdated'));
            showToast('سبد خرید پاک شد', 'success');
        }
    };

    const handleLocationSelect = async (data) => {
        const coords = { lat: data.lat, lng: data.lng };
        setCustomerCoords(coords);
        clearFieldError('coords');

        if (data.address) {
            setDeliveryAddress(data.address);
            clearFieldError('deliveryAddress');
        }

        setCalculating(true);

        try {
            const response = await calculateDelivery({
                destLat: coords.lat,
                destLng: coords.lng,
            });

            const result = response.data || {};
            setDeliveryPrice(result.price || 0);
            setDeliveryDistance(result.distance || 0);
        } catch (err) {
            console.warn('⚠️ API محاسبه هزینه خطا داد:', err);
            try {
                const tariffStr = localStorage.getItem(getTariffKey());
                if (tariffStr) {
                    const tariff = JSON.parse(tariffStr);
                    if (tariff.isActive === false) {
                        showToast('تعرفه پیک در حال حاضر غیرفعال است', 'error');
                        setDeliveryPrice(0);
                        setDeliveryDistance(0);
                        return;
                    }
                    const approxDistance = 5;
                    const price = (Number(tariff.baseFee) || 0) + (Number(tariff.perKmRate) || 0) * approxDistance;
                    setDeliveryPrice(price);
                    setDeliveryDistance(approxDistance);
                }
            } catch (e2) {
                console.error('خطا در خواندن تعرفه محلی:', e2);
            }
        } finally {
            setCalculating(false);
        }
    };

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const finalPrice = totalPrice + (deliveryMethod === 'DELIVERY' ? deliveryPrice : 0);

    // ============================================================
    //  🎯 اعتبارسنجی کامل با پیام دقیق
    // ============================================================
    const validateForm = () => {
        const errors = {
            customerName: '',
            customerPhone: '',
            deliveryAddress: '',
            coords: '',
        };
        let isValid = true;

        // ===== نام مشتری =====
        const name = customerName.trim();
        if (!name) {
            errors.customerName = 'نام مشتری الزامی است.';
            isValid = false;
        } else if (name.length < 3) {
            errors.customerName = 'نام باید حداقل ۳ کاراکتر باشد.';
            isValid = false;
        } else if (name.length > 100) {
            errors.customerName = 'نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد.';
            isValid = false;
        }

        // ===== شماره تلفن =====
        const phone = customerPhone.trim();
        if (!phone) {
            errors.customerPhone = 'شماره تماس الزامی است.';
            isValid = false;
        } else if (!/^\d+$/.test(phone)) {
            errors.customerPhone = 'شماره تماس فقط باید شامل عدد باشد.';
            isValid = false;
        } else if (phone.length < 10 || phone.length > 11) {
            errors.customerPhone = 'شماره تماس باید ۱۰ یا ۱۱ رقم باشد.';
            isValid = false;
        } else if (!phone.startsWith('0')) {
            errors.customerPhone = 'شماره تماس باید با ۰ شروع شود.';
            isValid = false;
        }

        // ===== اگه روش تحویل پیک =====
        if (deliveryMethod === 'DELIVERY') {
            if (!customerCoords) {
                errors.coords = 'لطفاً محل تحویل را روی نقشه انتخاب کنید.';
                isValid = false;
            }
            if (!deliveryAddress.trim()) {
                errors.deliveryAddress = 'آدرس تحویل الزامی است.';
                isValid = false;
            } else if (deliveryAddress.trim().length < 5) {
                errors.deliveryAddress = 'آدرس باید حداقل ۵ کاراکتر باشد.';
                isValid = false;
            } else if (deliveryAddress.trim().length > 200) {
                errors.deliveryAddress = 'آدرس نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد.';
                isValid = false;
            }

            if (deliveryPrice === 0 && customerCoords && !calculating) {
                errors.coords = 'هزینه پیک محاسبه نشد. لطفاً دوباره روی نقشه کلیک کنید.';
                isValid = false;
            }
        }

        setFieldErrors(errors);

        // نمایش اولین خطا به صورت Toast
        if (!isValid) {
            const firstError = Object.values(errors).find(e => e);
            if (firstError) {
                showToast(firstError, 'error');
            }
        }

        return isValid;
    };

    const handleContinue = () => {
        if (cart.length === 0) {
            showToast('سبد خرید خالی است', 'error');
            return;
        }

        // 🎯 اعتبارسنجی — اگه نامعتبر بود، نرو مرحله بعد
        if (!validateForm()) {
            return;
        }

        const checkoutData = {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            deliveryMethod,
            deliveryAddress: deliveryMethod === 'PICKUP'
                ? 'تحویل حضوری در نانوایی'
                : deliveryAddress.trim(),
            destinationLat: deliveryMethod === 'DELIVERY' && customerCoords ? customerCoords.lat : null,
            destinationLng: deliveryMethod === 'DELIVERY' && customerCoords ? customerCoords.lng : null,
            deliveryPrice: deliveryMethod === 'DELIVERY' ? deliveryPrice : 0,
            deliveryDistance: deliveryMethod === 'DELIVERY' ? deliveryDistance : 0,
            items: cart,
            totalPrice,
            totalItems,
            finalPrice,
        };

        try {
            localStorage.setItem(getCheckoutKey(), JSON.stringify(checkoutData));
        } catch (e) {
            console.error('خطا در ذخیره اطلاعات:', e);
        }

        navigate('/bakery/counter/courier');
    };

    if (cart.length === 0) {
        return (
            <div className="counter-cart-empty">
                <span className="empty-icon">🛒</span>
                <h2>سبد خرید خالی است</h2>
                <p>برای افزودن محصول به صفحه قبل برگردید.</p>
                <button className="btn-back-shop" onClick={() => navigate('/bakery/counter')}>
                    🍞 بازگشت به محصولات
                </button>
            </div>
        );
    }

    return (
        <div className="counter-cart-page">

            {/* ===== لیست آیتم‌های سبد ===== */}
            <div className="cart-items-section">
                <div className="cart-section-header">
                    <h3>🛒 آیتم‌های سفارش</h3>
                    <span className="items-count">{toPersianNumber(totalItems)} کالا</span>
                    <button className="btn-clear-cart" onClick={clearCart}>
                        🗑️ پاک کردن همه
                    </button>
                </div>

                <div className="cart-items-list-large">
                    {cart.map((item) => (
                        <div key={item.productId} className="cart-item-large">
                            <img
                                src={item.imageUrl || '/images/default-bread.png'}
                                alt={item.name}
                                className="item-image"
                                onError={(e) => e.target.src = '/images/default-bread.png'}
                            />
                            <div className="item-details">
                                <h4>{item.name}</h4>
                                <span className="item-price">{formatPrice(item.price)} ریال</span>
                            </div>
                            <div className="item-controls">
                                <button className="qty-btn-round minus" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                                <span className="qty-display-large">{toPersianNumber(item.quantity)}</span>
                                <button className="qty-btn-round plus" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                            </div>
                            <div className="item-total">{formatPrice(item.price * item.quantity)} ریال</div>
                            <button className="remove-item-btn" onClick={() => removeItem(item.productId)} title="حذف">✕</button>
                        </div>
                    ))}
                </div>

                <div className="cart-total-row">
                    <span>جمع کل:</span>
                    <strong>{formatPrice(totalPrice)} ریال</strong>
                </div>
            </div>

            {/* ===== روش تحویل ===== */}
            <div className="delivery-section">
                <h3>🚚 روش تحویل</h3>
                <div className="delivery-options">
                    <button
                        type="button"
                        className={`delivery-option ${deliveryMethod === 'PICKUP' ? 'active' : ''}`}
                        onClick={() => {
                            setDeliveryMethod('PICKUP');
                            setCustomerCoords(null);
                            setDeliveryAddress('');
                            setDeliveryPrice(0);
                            setDeliveryDistance(0);
                            setFieldErrors({ customerName: '', customerPhone: '', deliveryAddress: '', coords: '' });
                        }}
                    >
                        <span className="icon">📍</span>
                        <span className="title">حضوری</span>
                    </button>

                    <button
                        type="button"
                        className={`delivery-option ${deliveryMethod === 'DELIVERY' ? 'active' : ''}`}
                        onClick={() => setDeliveryMethod('DELIVERY')}
                    >
                        <span className="icon">🛵</span>
                        <span className="title">با پیک</span>
                    </button>
                </div>

                {deliveryMethod === 'DELIVERY' && (
                    <div className="delivery-address-box">
                        <label>📍 محل تحویل را روی نقشه انتخاب کنید *</label>

                        <MapPicker
                            center={{ lat: 31.8807429, lng: 54.382251 }}
                            zoom={13}
                            markerPosition={customerCoords}
                            onLocationSelect={handleLocationSelect}
                        />

                        {/* 🎯 خطای مختصات */}
                        {fieldErrors.coords && (
                            <div className="field-error-message" style={{
                                color: 'var(--red)',
                                fontSize: '10.5px',
                                marginTop: '4px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}>
                                ⚠️ {fieldErrors.coords}
                            </div>
                        )}

                        {customerCoords && (
                            <div className="coords-display">
                                مختصات: {toPersianNumber(customerCoords.lat.toFixed(5))}، {toPersianNumber(customerCoords.lng.toFixed(5))}
                            </div>
                        )}

                        {calculating && (
                            <div className="courier-price-box calculating">
                                <span className="spinner-small"></span>
                                <span>در حال محاسبه هزینه پیک...</span>
                            </div>
                        )}

                        {!calculating && deliveryPrice > 0 && (
                            <div className="courier-price-box success">
                                <div className="price-row">
                                    <span className="price-label">🛵 هزینه پیک:</span>
                                    <span className="price-value">{formatPrice(deliveryPrice)} ریال</span>
                                </div>
                                {deliveryDistance > 0 && (
                                    <div className="distance-row">
                                        مسافت تقریبی: {toPersianNumber(deliveryDistance)} کیلومتر
                                    </div>
                                )}
                            </div>
                        )}

                        <label style={{ marginTop: '10px' }}>
                            📝 آدرس دقیق (خودکار پر شده - قابل ویرایش) *
                        </label>
                        <textarea
                            value={deliveryAddress}
                            onChange={(e) => {
                                setDeliveryAddress(e.target.value);
                                clearFieldError('deliveryAddress');
                            }}
                            placeholder="با انتخاب روی نقشه، آدرس خودکار پر می‌شود..."
                            rows="3"
                            className={`address-textarea ${fieldErrors.deliveryAddress ? 'has-error' : ''}`}
                            style={{
                                borderColor: fieldErrors.deliveryAddress ? 'var(--red)' : undefined,
                            }}
                        />
                        {fieldErrors.deliveryAddress && (
                            <div style={{
                                color: 'var(--red)',
                                fontSize: '10.5px',
                                marginTop: '4px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}>
                                ⚠️ {fieldErrors.deliveryAddress}
                            </div>
                        )}
                        {deliveryAddress && !fieldErrors.deliveryAddress && (
                            <div style={{
                                marginTop: '4px',
                                fontSize: '10px',
                                color: 'var(--green-dark)',
                                fontWeight: '600',
                            }}>
                                ✅ آدرس ثبت شد — در صورت نیاز آن را ویرایش کنید
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== اطلاعات مشتری ===== */}
            <div className="customer-info-section">
                <h3>👤 اطلاعات مشتری</h3>
                <div className="customer-fields">
                    <div className="form-group">
                        <label>نام مشتری *</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => {
                                setCustomerName(e.target.value);
                                clearFieldError('customerName');
                            }}
                            placeholder="مثال: علی محمدی"
                            style={{
                                borderColor: fieldErrors.customerName ? 'var(--red)' : undefined,
                                background: fieldErrors.customerName ? 'rgba(192, 57, 43, 0.04)' : undefined,
                            }}
                        />
                        {fieldErrors.customerName && (
                            <div style={{
                                color: 'var(--red)',
                                fontSize: '10.5px',
                                marginTop: '3px',
                                fontWeight: '600',
                            }}>
                                ⚠️ {fieldErrors.customerName}
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label>شماره تماس *</label>
                        <input
                            type="text"
                            value={customerPhone}
                            onChange={(e) => {
                                setCustomerPhone(toEnglishNumber(e.target.value));
                                clearFieldError('customerPhone');
                            }}
                            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                            inputMode="numeric"
                            style={{
                                borderColor: fieldErrors.customerPhone ? 'var(--red)' : undefined,
                                background: fieldErrors.customerPhone ? 'rgba(192, 57, 43, 0.04)' : undefined,
                            }}
                        />
                        {fieldErrors.customerPhone && (
                            <div style={{
                                color: 'var(--red)',
                                fontSize: '10.5px',
                                marginTop: '3px',
                                fontWeight: '600',
                            }}>
                                ⚠️ {fieldErrors.customerPhone}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== جمع نهایی + دکمه‌ها ===== */}
            <div className="final-summary-box">
                <div className="final-summary-row">
                    <span>جمع کالاها:</span>
                    <span>{formatPrice(totalPrice)} ریال</span>
                </div>
                {deliveryMethod === 'DELIVERY' && deliveryPrice > 0 && (
                    <div className="final-summary-row delivery">
                        <span>هزینه پیک:</span>
                        <span>{formatPrice(deliveryPrice)} ریال</span>
                    </div>
                )}
                <div className="final-summary-row total">
                    <span>مبلغ قابل پرداخت:</span>
                    <strong>{formatPrice(finalPrice)} ریال</strong>
                </div>
            </div>

            <div className="counter-cart-actions">
                <button className="btn-secondary-action" onClick={() => navigate('/bakery/counter')}>
                    ← بازگشت به محصولات
                </button>
                <button className="btn-primary-action" onClick={handleContinue}>
                    ادامه و انتخاب پیک →
                </button>
            </div>
        </div>
    );
}

export default CounterCart;