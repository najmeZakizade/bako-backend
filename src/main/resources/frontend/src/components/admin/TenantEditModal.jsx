// src/components/admin/TenantEditModal.jsx
import { useState, useEffect } from 'react';
import { updateSuperAdminTenant } from '../../services/api';
import { showToast } from '../../utils/toast';
import '../../styles/tenant-edit-modal.css';

function TenantEditModal({ show, tenant, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
        enabled: true,
        zarinpalEnabled: false,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // پر کردن فرم از tenant
    useEffect(() => {
        if (show && tenant) {
            setForm({
                name: tenant.name || '',
                address: tenant.address || '',
                phone: tenant.phone || '',
                enabled: tenant.enabled !== false,
                zarinpalEnabled: tenant.zarinpalEnabled === true,
            });
            setErrors({});
        }
    }, [show, tenant]);

    // بستن با Escape
    useEffect(() => {
        if (!show) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !saving) onClose?.();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [show, saving, onClose]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            setErrors({ name: 'نام نانوایی الزامی است' });
            return;
        }

        setSaving(true);
        try {
            const id = tenant._id || tenant.id;
            const payload = {
                name: form.name.trim(),
                address: form.address.trim(),
                phone: form.phone.trim(),
                enabled: form.enabled,
                zarinpalEnabled: form.zarinpalEnabled,
            };

            const { data } = await updateSuperAdminTenant(id, payload);
            showToast('نانوایی با موفقیت به‌روزرسانی شد', 'success');
            onSaved?.(data);
            onClose?.();
        } catch (err) {
            console.error('❌ خطا در ذخیره:', err);
            showToast(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'خطا در ذخیره تغییرات',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div
            className="sa-modal-overlay"
            onClick={() => !saving && onClose?.()}
            role="dialog"
            aria-modal="true"
        >
            <div className="sa-modal" onClick={(e) => e.stopPropagation()}>

                {/* ===== هدر ===== */}
                <div className="sa-modal-header">
                    <h3>✏️ ویرایش نانوایی «{tenant?.name}»</h3>
                    <button
                        type="button"
                        className="sa-modal-close"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="بستن"
                    >
                        ✕
                    </button>
                </div>

                {/* ===== فرم ===== */}
                <form className="sa-modal-body" onSubmit={handleSubmit}>

                    {/* نام */}
                    <div className="sa-form-group">
                        <label>
                            نام نانوایی <span className="sa-required">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="مثال: نانوایی گلستان"
                            disabled={saving}
                        />
                        {errors.name && (
                            <span className="sa-error-text">{errors.name}</span>
                        )}
                    </div>

                    {/* تلفن */}
                    <div className="sa-form-group">
                        <label>شماره تماس</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="021-12345678 یا 09123456789"
                            dir="ltr"
                            disabled={saving}
                        />
                    </div>

                    {/* آدرس */}
                    <div className="sa-form-group">
                        <label>آدرس</label>
                        <textarea
                            value={form.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="آدرس کامل نانوایی"
                            rows={3}
                            disabled={saving}
                        />
                    </div>

                    {/* چک‌باکس‌ها */}
                    <div className="sa-form-checkboxes">
                        <label className="sa-checkbox">
                            <input
                                type="checkbox"
                                checked={form.enabled}
                                onChange={(e) =>
                                    handleChange('enabled', e.target.checked)
                                }
                                disabled={saving}
                            />
                            <span>نانوایی فعال است</span>
                        </label>

                        <label className="sa-checkbox">
                            <input
                                type="checkbox"
                                checked={form.zarinpalEnabled}
                                onChange={(e) =>
                                    handleChange('zarinpalEnabled', e.target.checked)
                                }
                                disabled={saving}
                            />
                            <span>درگاه پرداخت فعال است</span>
                        </label>
                    </div>

                    {/* ===== فوتر ===== */}
                    <div className="sa-modal-footer">
                        <button
                            type="button"
                            className="sa-btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            className="sa-btn-primary"
                            disabled={saving}
                        >
                            {saving ? '⏳ در حال ذخیره...' : '💾 ذخیره تغییرات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TenantEditModal;