// src/pages/customer/ProfilePage.jsx
import { useState, useEffect } from 'react';
import {
    getMyProfile,
    updateMyProfile,
    getMyAddresses,
    addMyAddress,
    updateMyAddress,
    deleteMyAddress,
    setDefaultAddress,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, toEnglishNumber } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import MapPicker from '../../components/map/MapPicker';
import '../../styles/customer-profile.css';

/* ============================================================
   آیکون عنوان‌های آدرس
   ============================================================ */
const TITLE_OPTIONS = [
    { value: 'خانه', icon: '🏠' },
    { value: 'محل کار', icon: '🏢' },
    { value: 'سایر', icon: '📍' },
];

function ProfilePage() {
    /* ============================================================
       State — کاربر
       ============================================================ */
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    /* ============================================================
       State — مودال ویرایش اطلاعات
       ============================================================ */
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFullName, setEditFullName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    /* ============================================================
       State — مودال تغییر رمز عبور
       ============================================================ */
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    /* ============================================================
       State — آدرس‌ها (API-based)
       ============================================================ */
    const [showAddresses, setShowAddresses] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [addressesLoaded, setAddressesLoaded] = useState(false);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [addressesError, setAddressesError] = useState('');

    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [savingAddress, setSavingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({
        title: 'خانه',
        fullAddress: '',
        phone: '',
        isDefault: false,
    });
    const [addressCoords, setAddressCoords] = useState(null);
    const [addressFieldErrors, setAddressFieldErrors] = useState({
        title: '',
        fullAddress: '',
        coords: '',
    });

    /* ============================================================
       🎯 بارگذاری کاربر از API (نه localStorage)
       - اگه API خطا داد، از localStorage به‌عنوان fallback استفاده می‌کنیم
       ============================================================ */
    useEffect(() => {
        const loadUser = async () => {
            setLoadingUser(true);
            try {
                // 🎯 اطلاعات کامل کاربر از سرور
                const res = await getMyProfile();
                const freshUser = res.data;

                if (freshUser) {
                    setUser(freshUser);
                    // آپدیت localStorage برای همگام‌سازی
                    localStorage.setItem('user', JSON.stringify(freshUser));
                }
            } catch (err) {
                console.warn('⚠️ خطا در دریافت پروفایل از سرور، استفاده از localStorage:', err);

                // fallback به localStorage
                try {
                    const userStr = localStorage.getItem('user');
                    const parsed = userStr ? JSON.parse(userStr) : null;
                    setUser(parsed);
                } catch {
                    setUser(null);
                }
            } finally {
                setLoadingUser(false);
            }
        };

        loadUser();
    }, []);

    /* ============================================================
       fetch آدرس‌ها — Lazy
       ============================================================ */
    const fetchAddresses = async (force = false) => {
        if (addressesLoaded && !force) return;

        setLoadingAddresses(true);
        setAddressesError('');

        try {
            const res = await getMyAddresses();
            setAddresses(res.data || []);
            setAddressesLoaded(true);
        } catch (err) {
            console.error('❌ خطا در دریافت آدرس‌ها:', err);

            if (err.response?.status === 403) {
                setAddressesError('دسترسی به این بخش ندارید.');
            } else if (err.response?.status === 404) {
                setAddressesError('سرویس آدرس‌ها یافت نشد.');
            } else if (!err.response) {
                setAddressesError('خطا در ارتباط با سرور.');
            } else {
                setAddressesError(
                    err.response?.data?.message || 'خطا در دریافت آدرس‌ها'
                );
            }
            setAddresses([]);
        } finally {
            setLoadingAddresses(false);
        }
    };

    /* ============================================================
       ویرایش اطلاعات — فقط نام
       ============================================================ */
    const openEditModal = () => {
        setEditFullName(user?.fullName || '');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editFullName.trim()) {
            showToast('نام نمی‌تواند خالی باشد', 'error');
            return;
        }

        setSavingProfile(true);
        try {
            // 🎯 ذخیره در سرور
            const res = await updateMyProfile({
                fullName: editFullName.trim(),
            });

            const updatedUser = res.data || {
                ...user,
                fullName: editFullName.trim(),
            };

            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setShowEditModal(false);
            showToast('اطلاعات با موفقیت ذخیره شد', 'success');
            window.dispatchEvent(new Event('userUpdated'));
        } catch (err) {
            console.error('❌ خطا در ذخیره پروفایل:', err);

            // اگه endpoint خطا داد، حداقل localStorage رو آپدیت کن
            try {
                const updatedUser = {
                    ...user,
                    fullName: editFullName.trim(),
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setShowEditModal(false);
                showToast('اطلاعات به‌صورت محلی ذخیره شد', 'success');
            } catch {
                showToast('خطا در ذخیره‌سازی', 'error');
            }
        } finally {
            setSavingProfile(false);
        }
    };

    /* ============================================================
       تغییر رمز عبور (UI-only)
       ============================================================ */
    const handleChangePassword = () => {
        if (!passwordForm.oldPassword || !passwordForm.newPassword) {
            showToast('همه فیلدها الزامی هستند', 'error');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            showToast('رمز جدید باید حداقل ۶ کاراکتر باشد', 'error');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast('تکرار رمز جدید مطابقت ندارد', 'error');
            return;
        }
        showToast('این قابلیت به‌زودی فعال می‌شود', 'error');
    };

    /* ============================================================
       باز/بسته کردن بخش آدرس‌ها
       ============================================================ */
    const toggleAddresses = () => {
        const next = !showAddresses;
        setShowAddresses(next);
        if (next && !addressesLoaded) {
            fetchAddresses();
        }
    };

    /* ============================================================
       مدیریت مودال آدرس
       ============================================================ */
    const openAddAddress = () => {
        setEditingAddressId(null);
        setAddressForm({
            title: 'خانه',
            fullAddress: '',
            phone: user?.phone || '',
            isDefault: addresses.length === 0,
        });
        setAddressCoords(null);
        setAddressFieldErrors({ title: '', fullAddress: '', coords: '' });
        setShowAddressModal(true);
    };

    const openEditAddress = (address) => {
        setEditingAddressId(address.id);
        setAddressForm({
            title: address.title || 'خانه',
            fullAddress: address.fullAddress || '',
            phone: address.phone || '',
            isDefault: address.isDefault || false,
        });
        setAddressCoords(
            address.latitude && address.longitude
                ? { lat: address.latitude, lng: address.longitude }
                : null
        );
        setAddressFieldErrors({ title: '', fullAddress: '', coords: '' });
        setShowAddressModal(true);
    };

    const closeAddressModal = () => {
        setShowAddressModal(false);
        setEditingAddressId(null);
        setAddressCoords(null);
    };

    const handleLocationSelect = (data) => {
        setAddressCoords({ lat: data.lat, lng: data.lng });
        setAddressFieldErrors((prev) => ({ ...prev, coords: '' }));

        if (data.address) {
            setAddressForm((prev) => ({ ...prev, fullAddress: data.address }));
            setAddressFieldErrors((prev) => ({ ...prev, fullAddress: '' }));
        }
    };

    const validateAddressForm = () => {
        const errors = { title: '', fullAddress: '', coords: '' };
        let isValid = true;

        if (!addressForm.title.trim()) {
            errors.title = 'عنوان الزامی است.';
            isValid = false;
        }
        if (!addressCoords) {
            errors.coords = 'لطفاً محل را روی نقشه انتخاب کنید.';
            isValid = false;
        }
        if (!addressForm.fullAddress.trim()) {
            errors.fullAddress = 'آدرس متنی الزامی است.';
            isValid = false;
        }

        setAddressFieldErrors(errors);
        if (!isValid) {
            const firstError = Object.values(errors).find((e) => e);
            if (firstError) showToast(firstError, 'error');
        }
        return isValid;
    };

    /* ============================================================
       ذخیره آدرس (API)
       ============================================================ */
    const handleSaveAddress = async () => {
        if (!validateAddressForm()) return;

        setSavingAddress(true);
        try {
            const payload = {
                title: addressForm.title.trim(),
                fullAddress: addressForm.fullAddress.trim(),
                phone: toEnglishNumber(addressForm.phone.trim()),
                latitude: addressCoords.lat,
                longitude: addressCoords.lng,
                isDefault: addressForm.isDefault,
            };

            if (editingAddressId) {
                await updateMyAddress(editingAddressId, payload);
                showToast('آدرس با موفقیت ویرایش شد', 'success');
            } else {
                await addMyAddress(payload);
                showToast('آدرس با موفقیت اضافه شد', 'success');
            }

            await fetchAddresses(true);
            closeAddressModal();
        } catch (err) {
            console.error('❌ خطا در ذخیره آدرس:', err);
            showToast(
                err.response?.data?.message || 'خطا در ذخیره آدرس',
                'error'
            );
        } finally {
            setSavingAddress(false);
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm('آیا از حذف این آدرس اطمینان دارید؟')) return;

        try {
            await deleteMyAddress(addressId);
            await fetchAddresses(true);
            showToast('آدرس حذف شد', 'success');
        } catch (err) {
            console.error('❌ خطا در حذف آدرس:', err);
            showToast('خطا در حذف آدرس', 'error');
        }
    };

    const handleSetDefault = async (addressId) => {
        try {
            await setDefaultAddress(addressId);
            await fetchAddresses(true);
            showToast('آدرس پیش‌فرض تنظیم شد', 'success');
        } catch (err) {
            console.error('❌ خطا در تنظیم پیش‌فرض:', err);
            showToast('خطا در تنظیم آدرس پیش‌فرض', 'error');
        }
    };

    /* ============================================================
       رندر — حالت بارگذاری اولیه
       ============================================================ */
    if (loadingUser) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری پروفایل...</p>
            </div>
        );
    }

    /* ============================================================
       رندر — کاربر لاگین نکرده
       ============================================================ */
    if (!user) {
        return (
            <div className="empty-cart">
                <span style={{ fontSize: '52px', display: 'block', marginBottom: '10px' }}>
                    🔒
                </span>
                <h2>اطلاعات کاربری موجود نیست</h2>
                <p>لطفاً دوباره وارد شوید.</p>
            </div>
        );
    }

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="profile-wrapper">

            <PageTitle
                image="/sidebar-icons/profile.png"
                fallbackIcon="👤"
                title="پروفایل کاربری"
            />

            {/* ===== دو کارت کنار هم ===== */}
            <div className="profile-grid">

                {/* کارت اطلاعات حساب */}
                <div className="profile-menu-card">
                    <h3 className="profile-menu-title">📋 اطلاعات حساب</h3>

                    <div className="profile-menu-row">
                        <span className="profile-row-icon">👤</span>
                        <span className="profile-row-label">نام و نام خانوادگی</span>
                        <span className="profile-row-value">{user.fullName || '—'}</span>
                    </div>

                    <div className="profile-menu-row">
                        <span className="profile-row-icon">📱</span>
                        <span className="profile-row-label">شماره موبایل</span>
                        <span className="profile-row-value">
                            {user.phone ? toPersianNumber(user.phone) : '—'}
                        </span>
                    </div>

                    <div className="profile-menu-row">
                        <span className="profile-row-icon">🆔</span>
                        <span className="profile-row-label">نام کاربری</span>
                        <span className="profile-row-value">{user.username || '—'}</span>
                    </div>
                </div>

                {/* کارت تنظیمات حساب */}
                <div className="profile-menu-card">
                    <h3 className="profile-menu-title">⚙️ تنظیمات حساب</h3>

                    <button
                        type="button"
                        className="profile-menu-row profile-menu-action"
                        onClick={openEditModal}
                    >
                        <span className="profile-row-icon">✏️</span>
                        <span className="profile-row-label">ویرایش اطلاعات</span>
                        <span className="profile-row-chevron">›</span>
                    </button>

                    <button
                        type="button"
                        className="profile-menu-row profile-menu-action"
                        onClick={() => setShowPasswordModal(true)}
                    >
                        <span className="profile-row-icon">🔒</span>
                        <span className="profile-row-label">تغییر رمز عبور</span>
                        <span className="profile-row-chevron">›</span>
                    </button>

                    <button
                        type="button"
                        className="profile-menu-row profile-menu-action"
                        onClick={toggleAddresses}
                    >
                        <span className="profile-row-icon">📍</span>
                        <span className="profile-row-label">آدرس‌های من</span>
                        {addressesLoaded && addresses.length > 0 && (
                            <span className="profile-row-badge">
                                {toPersianNumber(addresses.length)} آدرس
                            </span>
                        )}
                        <span
                            className={`profile-row-chevron ${
                                showAddresses ? 'open' : ''
                            }`}
                        >
                            ›
                        </span>
                    </button>
                </div>
            </div>

            {/* ===== بخش آدرس‌ها ===== */}
            {showAddresses && (
                <div className="addresses-section">
                    <div className="addresses-header">
                        <h2 className="addresses-title">📍 آدرس‌های من</h2>
                        {!addressesError && (
                            <button
                                type="button"
                                className="btn-add-address"
                                onClick={openAddAddress}
                            >
                                ➕ افزودن آدرس جدید
                            </button>
                        )}
                    </div>

                    {loadingAddresses ? (
                        <div className="addresses-empty">
                            <div className="spinner"></div>
                            <p>⏳ در حال بارگذاری...</p>
                        </div>
                    ) : addressesError ? (
                        <div className="addresses-empty">
                            <span className="empty-icon">🔒</span>
                            <h3>دسترسی امکان‌پذیر نیست</h3>
                            <p>{addressesError}</p>
                            <button
                                type="button"
                                className="btn-secondary-action"
                                onClick={() => fetchAddresses(true)}
                                style={{
                                    marginTop: '12px',
                                    display: 'inline-flex',
                                    justifyContent: 'center',
                                }}
                            >
                                🔄 تلاش مجدد
                            </button>
                        </div>
                    ) : addresses.length === 0 ? (
                        <div className="addresses-empty">
                            <span className="empty-icon">📍</span>
                            <h3>هنوز آدرسی ثبت نکرده‌اید</h3>
                            <p>برای شروع، اولین آدرس خود را اضافه کنید.</p>
                        </div>
                    ) : (
                        <div className="addresses-grid">
                            {addresses.map((address) => {
                                const titleOption = TITLE_OPTIONS.find(
                                    (t) => t.value === address.title
                                );
                                const titleIcon = titleOption?.icon || '📍';

                                return (
                                    <div
                                        key={address.id}
                                        className={`address-card ${
                                            address.isDefault ? 'is-default' : ''
                                        }`}
                                    >
                                        {address.isDefault && (
                                            <span className="default-badge">
                                                ⭐ پیش‌فرض
                                            </span>
                                        )}

                                        <div className="address-card-header">
                                            <span className="address-icon">{titleIcon}</span>
                                            <h4 className="address-title">{address.title}</h4>
                                        </div>

                                        <p className="address-text">
                                            {address.fullAddress}
                                        </p>

                                        {address.phone && (
                                            <p className="address-phone">
                                                📞 {toPersianNumber(address.phone)}
                                            </p>
                                        )}

                                        <div className="address-actions">
                                            {!address.isDefault && (
                                                <button
                                                    type="button"
                                                    className="address-action-btn default"
                                                    onClick={() => handleSetDefault(address.id)}
                                                >
                                                    ⭐ پیش‌فرض
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="address-action-btn edit"
                                                onClick={() => openEditAddress(address)}
                                            >
                                                ✏️ ویرایش
                                            </button>
                                            <button
                                                type="button"
                                                className="address-action-btn delete"
                                                onClick={() => handleDeleteAddress(address.id)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ===== مودال ویرایش اطلاعات ===== */}
            {showEditModal && (
                <div className="address-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="address-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="address-modal-header">
                            <h3>✏️ ویرایش اطلاعات</h3>
                            <button
                                type="button"
                                className="address-modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="address-modal-body">
                            <div className="form-group">
                                <label>نام و نام خانوادگی</label>
                                <input
                                    type="text"
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    placeholder="نام و نام خانوادگی"
                                />
                            </div>

                            <div className="form-group">
                                <label>شماره موبایل</label>
                                <input
                                    type="text"
                                    value={user.phone ? toPersianNumber(user.phone) : '—'}
                                    disabled
                                    readOnly
                                    style={{
                                        background: '#f0ebe7',
                                        color: '#7a5a48',
                                        cursor: 'not-allowed',
                                    }}
                                />
                                <small
                                    style={{
                                        fontSize: '10.5px',
                                        color: '#7a5a48',
                                        marginTop: '4px',
                                        display: 'block',
                                    }}
                                >
                                    ⚠️ شماره موبایل قابل تغییر نیست
                                </small>
                            </div>
                        </div>

                        <div className="address-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary-action"
                                onClick={() => setShowEditModal(false)}
                                disabled={savingProfile}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                className="btn-primary-action confirm"
                                onClick={handleSaveEdit}
                                disabled={savingProfile}
                            >
                                {savingProfile ? '⏳ در حال ذخیره...' : '✅ ذخیره'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== مودال تغییر رمز عبور ===== */}
            {showPasswordModal && (
                <div
                    className="address-modal-overlay"
                    onClick={() => setShowPasswordModal(false)}
                >
                    <div className="address-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="address-modal-header">
                            <h3>🔒 تغییر رمز عبور</h3>
                            <button
                                type="button"
                                className="address-modal-close"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="address-modal-body">
                            <div className="form-group">
                                <label>رمز عبور فعلی</label>
                                <input
                                    type="password"
                                    value={passwordForm.oldPassword}
                                    onChange={(e) =>
                                        setPasswordForm((prev) => ({
                                            ...prev,
                                            oldPassword: e.target.value,
                                        }))
                                    }
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="form-group">
                                <label>رمز عبور جدید</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                        setPasswordForm((prev) => ({
                                            ...prev,
                                            newPassword: e.target.value,
                                        }))
                                    }
                                    placeholder="حداقل ۶ کاراکتر"
                                />
                            </div>

                            <div className="form-group">
                                <label>تکرار رمز عبور جدید</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                        setPasswordForm((prev) => ({
                                            ...prev,
                                            confirmPassword: e.target.value,
                                        }))
                                    }
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="address-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary-action"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                className="btn-primary-action confirm"
                                onClick={handleChangePassword}
                            >
                                ✅ تغییر رمز
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== مودال افزودن / ویرایش آدرس ===== */}
            {showAddressModal && (
                <div className="address-modal-overlay" onClick={closeAddressModal}>
                    <div className="address-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="address-modal-header">
                            <h3>
                                {editingAddressId ? '✏️ ویرایش آدرس' : '➕ افزودن آدرس جدید'}
                            </h3>
                            <button
                                type="button"
                                className="address-modal-close"
                                onClick={closeAddressModal}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="address-modal-body">
                            <div className="form-group">
                                <label>عنوان آدرس *</label>
                                <div className="title-options">
                                    {TITLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`title-option-btn ${
                                                addressForm.title === opt.value ? 'active' : ''
                                            }`}
                                            onClick={() =>
                                                setAddressForm((prev) => ({
                                                    ...prev,
                                                    title: opt.value,
                                                }))
                                            }
                                        >
                                            <span>{opt.icon}</span>
                                            {opt.value}
                                        </button>
                                    ))}
                                </div>
                                {addressFieldErrors.title && (
                                    <div className="field-error">
                                        ⚠️ {addressFieldErrors.title}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>📍 موقعیت روی نقشه *</label>
                                <MapPicker
                                    center={
                                        addressCoords || {
                                            lat: 31.8807429,
                                            lng: 54.382251,
                                        }
                                    }
                                    zoom={13}
                                    markerPosition={addressCoords}
                                    onLocationSelect={handleLocationSelect}
                                />
                                {addressCoords && (
                                    <div className="coords-display">
                                        مختصات: {toPersianNumber(addressCoords.lat.toFixed(5))}،{' '}
                                        {toPersianNumber(addressCoords.lng.toFixed(5))}
                                    </div>
                                )}
                                {addressFieldErrors.coords && (
                                    <div className="field-error">
                                        ⚠️ {addressFieldErrors.coords}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>
                                    📝 آدرس دقیق (خودکار پر می‌شود — قابل ویرایش) *
                                </label>
                                <textarea
                                    value={addressForm.fullAddress}
                                    onChange={(e) => {
                                        setAddressForm((prev) => ({
                                            ...prev,
                                            fullAddress: e.target.value,
                                        }));
                                        setAddressFieldErrors((prev) => ({
                                            ...prev,
                                            fullAddress: '',
                                        }));
                                    }}
                                    placeholder="با انتخاب روی نقشه، آدرس خودکار پر می‌شود..."
                                    rows="3"
                                />
                                {addressFieldErrors.fullAddress && (
                                    <div className="field-error">
                                        ⚠️ {addressFieldErrors.fullAddress}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>📞 شماره تماس (اختیاری)</label>
                                <input
                                    type="text"
                                    value={addressForm.phone}
                                    onChange={(e) =>
                                        setAddressForm((prev) => ({
                                            ...prev,
                                            phone: toEnglishNumber(e.target.value),
                                        }))
                                    }
                                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                    inputMode="numeric"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={addressForm.isDefault}
                                        onChange={(e) =>
                                            setAddressForm((prev) => ({
                                                ...prev,
                                                isDefault: e.target.checked,
                                            }))
                                        }
                                    />
                                    <span>این آدرس پیش‌فرض من باشد</span>
                                </label>
                            </div>
                        </div>

                        <div className="address-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary-action"
                                onClick={closeAddressModal}
                                disabled={savingAddress}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                className="btn-primary-action confirm"
                                onClick={handleSaveAddress}
                                disabled={savingAddress}
                            >
                                {savingAddress ? '⏳ در حال ذخیره...' : '✅ ذخیره آدرس'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfilePage;