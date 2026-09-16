// src/pages/admin/TenantPaymentConfig.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import {
    getAllTenants,
    getTenantPaymentConfig,
    updateTenantPaymentConfig,
} from '../../services/api';
import '../../styles/super-admin.css';

// ============================================================
//  لوگوی نانوایی (تصویر + fallback ایموجی)
// ============================================================
function TenantLogo({ tenant }) {
    const [mode, setMode] = useState(() => {
        if (tenant.logoUrl) return 'logo';
        if (tenant.coverImageUrl) return 'cover';
        return 'fallback';
    });

    const handleError = () => {
        if (mode === 'logo' && tenant.coverImageUrl) {
            setMode('cover');
        } else {
            setMode('fallback');
        }
    };

    if (mode === 'fallback') {
        return <span className="tpc-tenant-logo-emoji">🏪</span>;
    }

    const src = mode === 'logo' ? tenant.logoUrl : tenant.coverImageUrl;

    return (
        <img
            src={src}
            alt={tenant.name || 'نانوایی'}
            className="tpc-tenant-logo-img"
            onError={handleError}
            draggable={false}
        />
    );
}

// ============================================================
//  صفحه اصلی
// ============================================================
function TenantPaymentConfig() {
    const { tenantId } = useParams();
    const navigate = useNavigate();

    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [saving, setSaving] = useState(false);
    const [headerIconError, setHeaderIconError] = useState(false);

    const [formData, setFormData] = useState({
        merchantId: '',
        enabled: false,
        sandbox: true,
        paymentAccountName: '',
        paymentAccountIban: '',
    });

    // ============================================================
    //  بارگذاری
    // ============================================================
    useEffect(() => {
        const fetchTenants = async () => {
            try {
                setLoading(true);
                const res = await getAllTenants();
                const list = res.data || [];
                setTenants(list);

                if (tenantId) {
                    const found = list.find((t) => (t._id || t.id) === tenantId);
                    if (found) await loadTenantConfig(found);
                }
            } catch (err) {
                console.error('خطا در دریافت نانوایی‌ها:', err);
                showToast('خطا در دریافت لیست نانوایی‌ها', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchTenants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    const loadTenantConfig = async (tenant) => {
        try {
            setSelectedTenant(tenant);
            const id = tenant._id || tenant.id;
            const res = await getTenantPaymentConfig(id);
            const data = res.data || {};
            setFormData({
                merchantId: data.merchantId || '',
                enabled: data.enabled || false,
                sandbox: data.sandbox !== false,
                paymentAccountName: data.paymentAccountName || '',
                paymentAccountIban: data.paymentAccountIban || '',
            });
        } catch (err) {
            console.error('خطا در دریافت تنظیمات:', err);
            setFormData({
                merchantId: tenant.zarinpalMerchantId || '',
                enabled: tenant.zarinpalEnabled || false,
                sandbox: tenant.zarinpalSandbox !== false,
                paymentAccountName: tenant.paymentAccountName || '',
                paymentAccountIban: tenant.paymentAccountIban || '',
            });
        }
    };

    const handleSelectTenant = (tenant) => loadTenantConfig(tenant);

    // ============================================================
    //  ذخیره
    // ============================================================
    const handleSave = async () => {
        if (!selectedTenant) return;

        const merchantId = formData.merchantId.trim();
        if (merchantId && !isValidMerchantId(merchantId)) {
            showToast(
                'کد Merchant ID وارد شده صحیح نیست. ' +
                'این کد را از پنل زرین‌پال خود کپی کنید.',
                'error'
            );
            return;
        }

        const iban = formData.paymentAccountIban.trim();
        if (iban && !iban.match(/^IR\d{24}$/)) {
            showToast(
                'شماره شبا وارد شده صحیح نیست. ' +
                'باید با «IR» شروع شده و بعد از آن ۲۴ رقم باشد.',
                'error'
            );
            return;
        }

        try {
            setSaving(true);
            const id = selectedTenant._id || selectedTenant.id;
            const res = await updateTenantPaymentConfig(id, formData);

            if (res.data && res.data.success === false) {
                showToast(res.data.message || 'خطا در ذخیره تنظیمات', 'error');
                return;
            }

            showToast('✅ تنظیمات با موفقیت ذخیره شد', 'success');

            setTenants((prev) =>
                prev.map((t) =>
                    (t._id || t.id) === id
                        ? {
                            ...t,
                            zarinpalMerchantId: formData.merchantId,
                            zarinpalEnabled: formData.enabled,
                        }
                        : t
                )
            );
        } catch (err) {
            console.error('خطا در ذخیره:', err);
            const msg = err.response?.data?.message || 'خطا در ذخیره تنظیمات';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setSelectedTenant(null);
        setFormData({
            merchantId: '',
            enabled: false,
            sandbox: true,
            paymentAccountName: '',
            paymentAccountIban: '',
        });
        if (tenantId) navigate('/admin/payment-config');
    };

    const isValidMerchantId = (id) => {
        if (!id) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    return (
        <div className="tenant-payment-config">
            {/* ===== هدر ===== */}
            <div className="admin-dashboard-header">
                <h1>
                    {!headerIconError ? (
                        <img
                            src="/admin-sidebar-icons/payment.png"
                            alt="پرداخت"
                            className="admin-header-icon"
                            onError={() => setHeaderIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">💳</span>
                    )}
                    تنظیمات درگاه پرداخت
                </h1>
            </div>

            {/* ===== گرید نانوایی‌ها (۳ تا در خط) ===== */}
            {tenants.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">🏪</span>
                    <h3>نانوایی‌ای ثبت نشده است</h3>
                    <p>ابتدا از بخش «نانوایی‌ها» یک نانوایی بسازید</p>
                </div>
            ) : (
                <div className="tpc-tenants-grid">
                    {tenants.map((tenant) => {
                        const id = tenant._id || tenant.id;
                        const isSelected =
                            selectedTenant &&
                            (selectedTenant._id || selectedTenant.id) === id;
                        const hasConfig =
                            tenant.zarinpalMerchantId && tenant.zarinpalEnabled;

                        return (
                            <button
                                key={id}
                                type="button"
                                className={`tpc-tenant-card ${
                                    isSelected ? 'tpc-tenant-card-selected' : ''
                                }`}
                                onClick={() => handleSelectTenant(tenant)}
                            >
                                <div className="tpc-tenant-logo">
                                    <TenantLogo tenant={tenant} />
                                </div>
                                <div className="tpc-tenant-info">
                                    <h4 className="tpc-tenant-name">
                                        {tenant.name}
                                    </h4>
                                    <p className="tpc-tenant-address">
                                        {tenant.address || 'آدرس ثبت نشده'}
                                    </p>
                                    <span
                                        className={`tpc-tenant-status ${
                                            hasConfig ? 'active' : 'inactive'
                                        }`}
                                    >
                                        {hasConfig
                                            ? '✅ درگاه فعال'
                                            : '⛔ درگاه غیرفعال'}
                                    </span>
                                </div>
                                {isSelected && (
                                    <span className="tpc-tenant-check">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ===== پنل تنظیمات (زیر گرید) ===== */}
            {selectedTenant && (
                <div className="tpc-settings-panel">
                    <div className="payment-config-header">
                        <h3>تنظیمات پرداخت</h3>
                        <button
                            type="button"
                            className="btn-close-panel"
                            onClick={handleClose}
                            aria-label="بستن"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="payment-config-tenant-info">
                        <span className="info-icon">🏪</span>
                        <div>
                            <h4>{selectedTenant.name}</h4>
                            <p>{selectedTenant.address || 'آدرس ثبت نشده'}</p>
                        </div>
                    </div>

                    <div className="payment-config-form">
                        {/* Merchant ID */}
                        <div className="form-group">
                            <label>
                                کد Merchant ID زرین‌پال
                                {formData.merchantId && (
                                    <span
                                        className={`validation-badge ${
                                            isValidMerchantId(formData.merchantId)
                                                ? 'valid'
                                                : 'invalid'
                                        }`}
                                    >
                                        {isValidMerchantId(formData.merchantId)
                                            ? '✓ معتبر'
                                            : '✗ نامعتبر'}
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={formData.merchantId}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        merchantId: e.target.value.trim(),
                                    }))
                                }
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                dir="ltr"
                                style={{ fontFamily: 'monospace' }}
                            />
                            <small className="form-hint">
                                💡 این کد را از پنل زرین‌پال نانوایی کپی کنید
                                (شبیه: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
                            </small>
                        </div>

                        {/* نام صاحب حساب */}
                        <div className="form-group">
                            <label>نام صاحب حساب</label>
                            <input
                                type="text"
                                value={formData.paymentAccountName}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        paymentAccountName: e.target.value,
                                    }))
                                }
                                placeholder="نام و نام خانوادگی"
                            />
                        </div>

                        {/* شبا */}
                        <div className="form-group">
                            <label>شماره شبا (اختیاری)</label>
                            <input
                                type="text"
                                value={formData.paymentAccountIban}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        paymentAccountIban: e.target.value.trim(),
                                    }))
                                }
                                placeholder="IR000000000000000000000000"
                                dir="ltr"
                                style={{ fontFamily: 'monospace' }}
                            />
                            <small className="form-hint">
                                💡 باید با «IR» شروع شده و بعد از آن ۲۴ رقم باشد
                            </small>
                        </div>

                        {/* فعال/غیرفعال */}
                        <div className="form-group form-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            enabled: e.target.checked,
                                        }))
                                    }
                                />
                                <span className="toggle-text">
                                    درگاه پرداخت آنلاین فعال باشد
                                </span>
                            </label>
                        </div>

                        {/* Sandbox */}
                        <div className="form-group form-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={formData.sandbox}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            sandbox: e.target.checked,
                                        }))
                                    }
                                />
                                <span className="toggle-text">
                                    حالت تست (Sandbox)
                                </span>
                            </label>
                            <small className="form-hint">
                                ⚠️ برای پرداخت واقعی، این گزینه را غیرفعال کنید
                            </small>
                        </div>
                    </div>

                    <div className="payment-config-actions">
                        <button
                            type="button"
                            className="btn-secondary-action"
                            onClick={handleClose}
                            disabled={saving}
                        >
                            انصراف
                        </button>
                        <button
                            type="button"
                            className="btn-primary-action"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? '⏳ در حال ذخیره...' : '💾 ذخیره تنظیمات'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TenantPaymentConfig;