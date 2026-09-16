// src/pages/customer/DeliveryPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getCartItems,
    getMyAddresses,
    addMyAddress,
    calculateDelivery,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice, toEnglishNumber } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import MapPicker from '../../components/map/MapPicker';
import '../../styles/customer-delivery.css';

/* ============================================================
   آیکون عنوان‌های آدرس
   ============================================================ */
const TITLE_OPTIONS = [
    { value: 'خانه', icon: '🏠' },
    { value: 'محل کار', icon: '🏢' },
    { value: 'سایر', icon: '📍' },
];

const CHECKOUT_KEY = 'bako_customer_checkout';

function DeliveryPage() {
    const navigate = useNavigate();

    /* ============================================================
       State — سبد خرید
       ============================================================ */
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [totalPrice, setTotalPrice] = useState(0);
    const [tenantId, setTenantId] = useState(null);

    /* ============================================================
       State — کاربر
       ============================================================ */
    const [user, setUser] = useState(null);

    /* ============================================================
       State — آدرس‌ها
       ============================================================ */
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);

    /* ============================================================
       State — آدرس جدید
       ============================================================ */
    const [newAddressCoords, setNewAddressCoords] = useState(null);
    const [newAddressText, setNewAddressText] = useState('');
    const [newAddressPhone, setNewAddressPhone] = useState('');
    const [newAddressTitle, setNewAddressTitle] = useState('خانه');
    const [saveNewAddress, setSaveNewAddress] = useState(true);

    /* ============================================================
       State — روش تحویل + هزینه پیک
       ============================================================ */
    const [deliveryMethod, setDeliveryMethod] = useState('DELIVERY');
    const [deliveryPrice, setDeliveryPrice] = useState(0);
    const [deliveryDistance, setDeliveryDistance] = useState(0);
    const [calculating, setCalculating] = useState(false);

    /* ============================================================
       State — خطاها
       ============================================================ */
    const [fieldErrors, setFieldErrors] = useState({
        address: '',
        coords: '',
    });

    const [submitting, setSubmitting] = useState(false);

    /* ============================================================
       بارگذاری اولیه — سبد، آدرس‌ها، کاربر
       ============================================================ */
    useEffect(() => {
        // کاربر از localStorage
        try {
            const userStr = localStorage.getItem('user');
            const parsed = userStr ? JSON.parse(userStr) : null;
            setUser(parsed);
            if (parsed?.phone) {
                setNewAddressPhone(parsed.phone);
            }
        } catch {
            setUser(null);
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

                // tenantId از اولین آیتم
                if (data.length > 0) {
                    setTenantId(data[0].tenantId || null);
                }
            } catch (err) {
                console.error('❌ خطا در دریافت سبد خرید:', err);
                showToast('خطا در دریافت سبد خرید', 'error');
            } finally {
                setLoadingItems(false);
            }
        };

        // آدرس‌های کاربر
        const fetchAddresses = async () => {
            try {
                const res = await getMyAddresses();
                const list = res.data || [];
                setAddresses(list);

                // اگه آدرس داشت → پیش‌فرض رو انتخاب کن
                if (list.length > 0) {
                    const def = list.find((a) => a.isDefault);
                    setSelectedAddressId(def ? def.id : list[0].id);
                    setShowNewAddressForm(false);
                } else {
                    // آدرسی نداره → فرم نقشه رو نشون بده
                    setShowNewAddressForm(true);
                }
            } catch (err) {
                console.error('❌ خطا در دریافت آدرس‌ها:', err);
                setShowNewAddressForm(true);
            } finally {
                setLoadingAddresses(false);
            }
        };

        fetchCart();
        fetchAddresses();
    }, []);

    /* ============================================================
       انتخاب آدرس از لیست
       ============================================================ */
    const handleSelectAddress = (addressId) => {
        setSelectedAddressId(addressId);
        setShowNewAddressForm(false);
        setFieldErrors({ address: '', coords: '' });
    };

    /* ============================================================
       نمایش فرم افزودن آدرس جدید
       ============================================================ */
    const handleOpenNewAddressForm = () => {
        setShowNewAddressForm(true);
        setSelectedAddressId(null);
        setNewAddressCoords(null);
        setNewAddressText('');
        setNewAddressTitle('خانه');
        setNewAddressPhone(user?.phone || '');
        setSaveNewAddress(true);
        setDeliveryPrice(0);
        setDeliveryDistance(0);
        setFieldErrors({ address: '', coords: '' });
    };

    /* ============================================================
       انصراف از افزودن آدرس جدید
       ============================================================ */
    const handleCancelNewAddress = () => {
        setShowNewAddressForm(false);
        setNewAddressCoords(null);
        setNewAddressText('');
        setFieldErrors({ address: '', coords: '' });
        setDeliveryPrice(0);
        setDeliveryDistance(0);

        // برگرد به اولین آدرس
        if (addresses.length > 0) {
            const def = addresses.find((a) => a.isDefault);
            setSelectedAddressId(def ? def.id : addresses[0].id);
        }
    };

    /* ============================================================
       انتخاب موقعیت روی نقشه
       ============================================================ */
    const handleLocationSelect = async (data) => {
        const coords = { lat: data.lat, lng: data.lng };
        setNewAddressCoords(coords);
        setFieldErrors((prev) => ({ ...prev, coords: '' }));

        if (data.address) {
            setNewAddressText(data.address);
            setFieldErrors((prev) => ({ ...prev, address: '' }));
        }

        // محاسبه هزینه پیک
        await calculateDeliveryCost(coords);
    };

    /* ============================================================
       محاسبه هزینه پیک
       ============================================================ */
    const calculateDeliveryCost = async (coords) => {
        if (!coords || !coords.lat || !coords.lng) return;

        setCalculating(true);
        try {
            const payload = {
                destLat: coords.lat,
                destLng: coords.lng,
            };
            if (tenantId) payload.tenantId = tenantId;

            const response = await calculateDelivery(payload);
            const result = response.data || {};

            setDeliveryPrice(result.price || 0);
            setDeliveryDistance(Math.round(result.distance || 0));
        } catch (err) {
            console.warn('⚠️ خطا در محاسبه هزینه پیک:', err);
            setDeliveryPrice(0);
            setDeliveryDistance(0);
            showToast('خطا در محاسبه هزینه پیک', 'error');
        } finally {
            setCalculating(false);
        }
    };

    /* ============================================================
       وقتی آدرس انتخاب‌شده از لیست عوض می‌شه → دوباره محاسبه
       ============================================================ */
    useEffect(() => {
        if (deliveryMethod !== 'DELIVERY') {
            setDeliveryPrice(0);
            setDeliveryDistance(0);
            return;
        }

        if (showNewAddressForm && newAddressCoords) {
            return;
        }

        if (selectedAddressId && addresses.length > 0) {
            const addr = addresses.find((a) => a.id === selectedAddressId);
            if (addr?.latitude && addr?.longitude) {
                calculateDeliveryCost({
                    lat: addr.latitude,
                    lng: addr.longitude,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAddressId, deliveryMethod]);

    /* ============================================================
       تغییر روش تحویل
       ============================================================ */
    const handleChangeMethod = (method) => {
        setDeliveryMethod(method);
        setFieldErrors({ address: '', coords: '' });

        if (method === 'PICKUP') {
            setDeliveryPrice(0);
            setDeliveryDistance(0);
        }
    };

    /* ============================================================
       اعتبارسنجی و ادامه
       ============================================================ */
    const handleContinue = async () => {
        if (items.length === 0) {
            showToast('سبد خرید خالی است', 'error');
            return;
        }

        let finalAddress = null;

        if (deliveryMethod === 'DELIVERY') {
            if (showNewAddressForm) {
                // آدرس جدید
                if (!newAddressCoords) {
                    setFieldErrors((prev) => ({
                        ...prev,
                        coords: 'لطفاً موقعیت را روی نقشه انتخاب کنید.',
                    }));
                    showToast('لطفاً موقعیت را روی نقشه انتخاب کنید', 'error');
                    return;
                }
                if (!newAddressText.trim()) {
                    setFieldErrors((prev) => ({
                        ...prev,
                        address: 'آدرس متنی الزامی است.',
                    }));
                    showToast('آدرس متنی الزامی است', 'error');
                    return;
                }

                finalAddress = {
                    fullAddress: newAddressText.trim(),
                    latitude: newAddressCoords.lat,
                    longitude: newAddressCoords.lng,
                    phone: newAddressPhone.trim(),
                };

                // اگه کاربر خواست، ذخیره کن
                if (saveNewAddress) {
                    setSubmitting(true);
                    try {
                        const payload = {
                            title: newAddressTitle,
                            fullAddress: newAddressText.trim(),
                            phone: toEnglishNumber(newAddressPhone.trim()),
                            latitude: newAddressCoords.lat,
                            longitude: newAddressCoords.lng,
                            isDefault: addresses.length === 0,
                        };
                        await addMyAddress(payload);
                        showToast(
                            'آدرس به لیست آدرس‌های شما اضافه شد',
                            'success'
                        );
                    } catch (err) {
                        console.warn('⚠️ خطا در ذخیره آدرس:', err);
                        // ادامه می‌دیم حتی اگه ذخیره نشد
                    } finally {
                        setSubmitting(false);
                    }
                }
            } else {
                // آدرس از لیست
                const addr = addresses.find((a) => a.id === selectedAddressId);
                if (!addr) {
                    showToast('لطفاً یک آدرس انتخاب کنید', 'error');
                    return;
                }
                finalAddress = {
                    fullAddress: addr.fullAddress,
                    latitude: addr.latitude,
                    longitude: addr.longitude,
                    phone: addr.phone || user?.phone || '',
                };
            }

            if (deliveryPrice === 0 && !calculating) {
                showToast(
                    'هزینه پیک محاسبه نشد. لطفاً موقعیت را دوباره انتخاب کنید.',
                    'error'
                );
                return;
            }
        }

        // ذخیره در localStorage برای PaymentPage
        const checkoutData = {
            deliveryMethod, // 'PICKUP' | 'DELIVERY'
            address: finalAddress,
            deliveryPrice: deliveryMethod === 'DELIVERY' ? deliveryPrice : 0,
            deliveryDistance:
                deliveryMethod === 'DELIVERY' ? deliveryDistance : 0,
            customerName: user?.fullName || '',
            customerPhone: user?.phone || '',
            tenantId,
        };

        try {
            localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkoutData));
        } catch (e) {
            console.error('خطا در ذخیره اطلاعات:', e);
        }

        navigate('/payment');
    };

    /* ============================================================
       رندر — بارگذاری اولیه
       ============================================================ */
    if (loadingItems || loadingAddresses) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    /* ============================================================
       رندر — سبد خالی
       ============================================================ */
    if (items.length === 0) {
        return (
            <div className="counter-cart-empty">
                <span className="empty-icon">🛒</span>
                <h2>سبد خرید خالی است</h2>
                <p>برای افزودن محصول به صفحه نانوایی برگردید.</p>
                <button
                    className="btn-back-shop"
                    onClick={() => navigate('/')}
                >
                    🍞 مشاهده نانوایی‌ها
                </button>
            </div>
        );
    }

    const finalPrice =
        totalPrice + (deliveryMethod === 'DELIVERY' ? deliveryPrice : 0);

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="counter-cart-page">

            <PageTitle
                image="/sidebar-icons/cart.png"
                fallbackIcon="🚚"
                title="نحوه تحویل"
                count={`${toPersianNumber(items.length)} قلم`}
            />

            {/* ===== خلاصه سبد ===== */}
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
                                    src={
                                        item.product?.imageUrl ||
                                        '/images/default-bread.png'
                                    }
                                    alt={item.product?.name}
                                    className="item-image"
                                    onError={(e) => {
                                        e.target.src =
                                            '/images/default-bread.png';
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

                <div className="cart-total-row">
                    <span>جمع کالاها:</span>
                    <strong>{formatPrice(totalPrice)} ریال</strong>
                </div>
            </div>

            {/* ===== روش تحویل ===== */}
            <div className="delivery-section">
                <h3>🚚 روش تحویل</h3>
                <div className="delivery-options">
                    <button
                        type="button"
                        className={`delivery-option ${
                            deliveryMethod === 'PICKUP' ? 'active' : ''
                        }`}
                        onClick={() => handleChangeMethod('PICKUP')}
                    >
                        <span className="icon">📍</span>
                        <span className="title">حضوری</span>
                    </button>

                    <button
                        type="button"
                        className={`delivery-option ${
                            deliveryMethod === 'DELIVERY' ? 'active' : ''
                        }`}
                        onClick={() => handleChangeMethod('DELIVERY')}
                    >
                        <span className="icon">🛵</span>
                        <span className="title">با پیک</span>
                    </button>
                </div>

                {/* ===== حالت حضوری ===== */}
                {deliveryMethod === 'PICKUP' && (
                    <div
                        className="no-courier-needed"
                        style={{ marginTop: '12px' }}
                    >
                        <span className="info-icon">ℹ️</span>
                        <p>
                            سفارش خود را از نانوایی به‌صورت حضوری تحویل
                            بگیرید.
                        </p>
                    </div>
                )}

                {/* ===== حالت پیک ===== */}
                {deliveryMethod === 'DELIVERY' && (
                    <div className="delivery-address-box">

                        {/* ===== آدرس‌های ذخیره‌شده ===== */}
                        {!showNewAddressForm && addresses.length > 0 && (
                            <>
                                <label>
                                    📍 آدرس تحویل را انتخاب کنید *
                                </label>

                                <div className="delivery-addresses-list">
                                    {addresses.map((address) => {
                                        const titleOption =
                                            TITLE_OPTIONS.find(
                                                (t) =>
                                                    t.value === address.title
                                            );
                                        const titleIcon =
                                            titleOption?.icon || '📍';
                                        const isSelected =
                                            selectedAddressId === address.id;

                                        return (
                                            <button
                                                key={address.id}
                                                type="button"
                                                className={`delivery-address-card ${
                                                    isSelected
                                                        ? 'selected'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    handleSelectAddress(
                                                        address.id
                                                    )
                                                }
                                            >
                                                <div className="delivery-address-card-header">
                                                    <span className="delivery-address-icon">
                                                        {titleIcon}
                                                    </span>
                                                    <span className="delivery-address-title">
                                                        {address.title}
                                                    </span>
                                                    {address.isDefault && (
                                                        <span className="delivery-address-default">
                                                            ⭐ پیش‌فرض
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <span className="delivery-address-check">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="delivery-address-text">
                                                    {address.fullAddress}
                                                </p>
                                                {address.phone && (
                                                    <p className="delivery-address-phone">
                                                        📞{' '}
                                                        {toPersianNumber(
                                                            address.phone
                                                        )}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="btn-add-new-address"
                                    onClick={handleOpenNewAddressForm}
                                >
                                    ➕ افزودن آدرس جدید
                                </button>
                            </>
                        )}

                        {/* ===== فرم آدرس جدید ===== */}
                        {showNewAddressForm && (
                            <>
                                {addresses.length > 0 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent:
                                                'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        <label
                                            style={{
                                                fontSize: '11.5px',
                                                fontWeight: '800',
                                                color: 'var(--primary-dark)',
                                                margin: 0,
                                            }}
                                        >
                                            📍 آدرس جدید
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleCancelNewAddress}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--red)',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                padding: '2px 6px',
                                            }}
                                        >
                                            ✕ انصراف
                                        </button>
                                    </div>
                                )}

                                <label>
                                    📍 موقعیت خود را روی نقشه انتخاب کنید *
                                </label>

                                <MapPicker
                                    center={{
                                        lat: 31.8807429,
                                        lng: 54.382251,
                                    }}
                                    zoom={13}
                                    markerPosition={newAddressCoords}
                                    onLocationSelect={handleLocationSelect}
                                />

                                {fieldErrors.coords && (
                                    <div className="field-error-message">
                                        ⚠️ {fieldErrors.coords}
                                    </div>
                                )}

                                {newAddressCoords && (
                                    <div className="coords-display">
                                        مختصات:{' '}
                                        {toPersianNumber(
                                            newAddressCoords.lat.toFixed(5)
                                        )}
                                        ،{' '}
                                        {toPersianNumber(
                                            newAddressCoords.lng.toFixed(5)
                                        )}
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
                                            <span className="price-label">
                                                🛵 هزینه پیک:
                                            </span>
                                            <span className="price-value">
                                                {formatPrice(deliveryPrice)}{' '}
                                                ریال
                                            </span>
                                        </div>
                                        {deliveryDistance > 0 && (
                                            <div className="distance-row">
                                                مسافت تقریبی:{' '}
                                                {toPersianNumber(
                                                    deliveryDistance
                                                )}{' '}
                                                کیلومتر
                                            </div>
                                        )}
                                    </div>
                                )}

                                <label style={{ marginTop: '10px' }}>
                                    📝 آدرس دقیق (خودکار پر می‌شود — قابل
                                    ویرایش) *
                                </label>
                                <textarea
                                    value={newAddressText}
                                    onChange={(e) => {
                                        setNewAddressText(e.target.value);
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            address: '',
                                        }));
                                    }}
                                    placeholder="با انتخاب روی نقشه، آدرس خودکار پر می‌شود..."
                                    rows="3"
                                    className="address-textarea"
                                />
                                {fieldErrors.address && (
                                    <div className="field-error-message">
                                        ⚠️ {fieldErrors.address}
                                    </div>
                                )}

                                <label style={{ marginTop: '10px' }}>
                                    📞 شماره تماس (اختیاری)
                                </label>
                                <input
                                    type="text"
                                    value={newAddressPhone}
                                    onChange={(e) =>
                                        setNewAddressPhone(
                                            toEnglishNumber(e.target.value)
                                        )
                                    }
                                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                    inputMode="numeric"
                                    className="form-input"
                                    style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        border: '1.5px solid var(--gray)',
                                        borderRadius: '7px',
                                        fontFamily: 'inherit',
                                        fontSize: '11px',
                                        background: 'var(--cream-light)',
                                        outline: 'none',
                                    }}
                                />

                                <label
                                    className="checkbox-label"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '12px',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        color: 'var(--primary-dark)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={saveNewAddress}
                                        onChange={(e) =>
                                            setSaveNewAddress(
                                                e.target.checked
                                            )
                                        }
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            accentColor: 'var(--gold-dark)',
                                        }}
                                    />
                                    <span>
                                        این آدرس را برای سفارش‌های بعدی ذخیره
                                        کن
                                    </span>
                                </label>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ===== اطلاعات تماس ===== */}
            {user && (user.fullName || user.phone) && (
                <div className="customer-info-section">
                    <h3>👤 اطلاعات تماس</h3>
                    <div className="customer-fields">
                        {user.fullName && (
                            <div className="form-group">
                                <label>نام و نام خانوادگی</label>
                                <div
                                    style={{
                                        padding: '7px 10px',
                                        background: '#f0ebe7',
                                        borderRadius: '7px',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        color: 'var(--primary-dark)',
                                    }}
                                >
                                    {user.fullName}
                                </div>
                            </div>
                        )}
                        {user.phone && (
                            <div className="form-group">
                                <label>شماره تماس</label>
                                <div
                                    style={{
                                        padding: '7px 10px',
                                        background: '#f0ebe7',
                                        borderRadius: '7px',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        color: 'var(--primary-dark)',
                                    }}
                                >
                                    {toPersianNumber(user.phone)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== جمع نهایی ===== */}
            <div className="final-summary-box">
                <div className="final-summary-row">
                    <span>جمع کالاها:</span>
                    <span>{formatPrice(totalPrice)} ریال</span>
                </div>
                {deliveryMethod === 'DELIVERY' && deliveryPrice > 0 && (
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
                <Link to="/cart" className="btn-secondary-action">
                    ← بازگشت به سبد
                </Link>
                <button
                    className="btn-primary-action"
                    onClick={handleContinue}
                    disabled={submitting}
                >
                    {submitting
                        ? '⏳ در حال ذخیره...'
                        : 'ادامه به پرداخت →'}
                </button>
            </div>
        </div>
    );
}

export default DeliveryPage;