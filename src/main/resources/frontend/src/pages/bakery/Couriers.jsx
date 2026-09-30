// src/pages/bakery/Couriers.jsx
import { useState, useEffect } from 'react';
import {
    getCouriers,
    createCourier,
    updateCourier,
    deleteCourier,
    disableCourier,
    enableCourier
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, toEnglishNumber } from '../../utils/format';

// حروف مجاز پلاک ایران
const PLATE_LETTERS = ['ب', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ل', 'م', 'ن', 'و', 'ه', 'ی'];

// ===== تجزیه پلاک =====
function parsePlate(plate) {
    const empty = { twoDigit: '', letter: '', threeDigit: '', province: '' };
    if (!plate) return empty;
    const clean = String(plate)
        .replace(/ایران/g, '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .trim();
    const match = clean.match(/^(\d{1,2})\s*([آ-ی])\s*(\d{1,3})\s*-?\s*(\d{1,2})$/);
    if (!match) return empty;
    return {
        twoDigit: match[1] || '',
        letter: match[2] || '',
        threeDigit: match[3] || '',
        province: match[4] || '',
    };
}

// ===== ساخت رشته پلاک =====
function buildPlate({ plateTwoDigit, plateLetter, plateThreeDigit, plateProvince }) {
    if (!plateTwoDigit && !plateLetter && !plateThreeDigit && !plateProvince) return '';
    const td = String(plateTwoDigit || '').padStart(2, '0');
    const l = plateLetter || '';
    const th = String(plateThreeDigit || '').padStart(3, '0');
    const pv = String(plateProvince || '').padStart(2, '0');
    return `${td} ${l} ${th} - ${pv}`;
}

// ===== نمایش پلاک با اعداد فارسی =====
function displayPlate(plate) {
    if (!plate) return '—';
    return toPersianNumber(plate).replace(/-/g, ' - ');
}

function Couriers() {
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        vehicleType: 'MOTORCYCLE',
        plateTwoDigit: '',
        plateLetter: '',
        plateThreeDigit: '',
        plateProvince: '',
        nationalId: '',
        address: '',
    });
    const [submitLoading, setSubmitLoading] = useState(false);

    // ===== دریافت tenantId از کاربر لاگین‌شده =====
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

    useEffect(() => {
        fetchCouriers();
    }, []);

    const fetchCouriers = async () => {
        try {
            setLoading(true);
            const res = await getCouriers();
            const data = res.data || [];
            const formatted = data.map(c => ({
                id: c.id || c._id,
                fullName: c.fullName || 'نامشخص',
                phone: c.phone || '',
                vehicleType: c.vehicleType || 'MOTORCYCLE',
                vehiclePlate: c.vehiclePlate || '',
                nationalId: c.nationalId || '',
                address: c.address || '',
                status: c.enabled ? 'ACTIVE' : 'INACTIVE',
            }));
            setCouriers(formatted);
        } catch (err) {
            console.error(err);
            showToast('خطا در دریافت لیست پیک‌ها', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        const numericFields = ['phone', 'nationalId'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: toEnglishNumber(value) }));
            return;
        }

        if (name === 'plateTwoDigit') {
            const v = toEnglishNumber(value).replace(/\D/g, '').slice(0, 2);
            setFormData(prev => ({ ...prev, [name]: v }));
            return;
        }
        if (name === 'plateThreeDigit') {
            const v = toEnglishNumber(value).replace(/\D/g, '').slice(0, 3);
            setFormData(prev => ({ ...prev, [name]: v }));
            return;
        }
        if (name === 'plateProvince') {
            const v = toEnglishNumber(value).replace(/\D/g, '').slice(0, 2);
            setFormData(prev => ({ ...prev, [name]: v }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePlateLetterChange = (e) => {
        setFormData(prev => ({ ...prev, plateLetter: e.target.value }));
    };

    // ===== استخراج پیام خطا از پاسخ سرور =====
    const extractErrorMessage = (err) => {
        if (err.response?.data?.errors) {
            const errors = err.response.data.errors;
            if (Array.isArray(errors)) {
                return errors
                    .map(e => e.message || e.defaultMessage || 'خطای اعتبارسنجی')
                    .join(' • ');
            }
            if (typeof errors === 'object') {
                return Object.values(errors).flat().join(' • ');
            }
        }
        if (err.response?.data?.message) {
            return err.response.data.message;
        }
        return err.message || 'خطا در ارتباط با سرور';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ===== اعتبارسنجی سمت کلاینت =====
        if (!formData.fullName.trim()) {
            showToast('لطفاً نام کامل را وارد کنید.', 'error');
            return;
        }
        if (!formData.phone.trim()) {
            showToast('لطفاً شماره تماس را وارد کنید.', 'error');
            return;
        }
        if (!formData.plateTwoDigit || !formData.plateLetter ||
            !formData.plateThreeDigit || !formData.plateProvince) {
            showToast('لطفاً تمام بخش‌های پلاک را کامل کنید.', 'error');
            return;
        }
        if (!formData.address.trim()) {
            showToast('لطفاً آدرس پیک را وارد کنید.', 'error');
            return;
        }

        // ===== دریافت tenantId =====
        const tenantId = getTenantId();
        if (!tenantId) {
            showToast('خطا در شناسایی نانوایی. لطفاً دوباره وارد شوید.', 'error');
            return;
        }

        setSubmitLoading(true);

        try {
            const plateString = buildPlate(formData);

            const payload = {
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim(),
                vehicleType: formData.vehicleType,
                vehiclePlate: plateString,
                nationalId: formData.nationalId?.trim() || '',
                address: formData.address.trim(),
                tenantId: tenantId,
            };

            if (editingId) {
                await updateCourier(editingId, payload);
                showToast('پیک با موفقیت ویرایش شد', 'success');
            } else {
                await createCourier(payload);
                showToast('پیک جدید اضافه شد', 'success');
            }

            resetForm();
            await fetchCouriers();
        } catch (err) {
            console.error(err);
            const msg = extractErrorMessage(err);
            showToast(msg, 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            phone: '',
            vehicleType: 'MOTORCYCLE',
            plateTwoDigit: '',
            plateLetter: '',
            plateThreeDigit: '',
            plateProvince: '',
            nationalId: '',
            address: '',
        });
        setEditingId(null);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        const parts = parsePlate(item.vehiclePlate);
        setFormData({
            fullName: item.fullName || '',
            phone: item.phone || '',
            vehicleType: item.vehicleType || 'MOTORCYCLE',
            plateTwoDigit: parts.twoDigit,
            plateLetter: parts.letter,
            plateThreeDigit: parts.threeDigit,
            plateProvince: parts.province,
            nationalId: item.nationalId || '',
            address: item.address || '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) {
            try {
                await deleteCourier(id);
                await fetchCouriers();
                showToast(`پیک "${name}" حذف شد`, 'success');
            } catch (err) {
                showToast('خطا در حذف پیک', 'error');
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            if (currentStatus === 'ACTIVE') {
                await disableCourier(id);
                showToast('پیک غیرفعال شد', 'success');
            } else {
                await enableCourier(id);
                showToast('پیک فعال شد', 'success');
            }
            await fetchCouriers();
        } catch (err) {
            showToast('خطا در تغییر وضعیت', 'error');
        }
    };

    // ===== برچسب نوع وسیله =====
    const getVehicleLabel = (type) => {
        const map = {
            'MOTORCYCLE': '🏍️ موتورسیکلت',
            'CAR': '🚗 خودرو',
        };
        return map[type] || type;
    };

    if (loading) {
        return <div className="counter-loading">⏳ در حال بارگذاری...</div>;
    }

    const btnStyle = {
        padding: '4px 12px',
        fontSize: '13px',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        height: '34px',
        minWidth: '90px',
        color: '#fff',
        fontWeight: '500',
        background: '#5C3317',
    };

    const actionBtnStyle = {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        padding: '4px 6px',
        borderRadius: '4px',
        transition: 'background 0.2s',
        lineHeight: 1,
    };

    return (
        <div className="staff-management">

            {/* ===== فرم افزودن/ویرایش ===== */}
            <div className="staff-form">
                <h3>{editingId ? '✏️ ویرایش پیک' : '➕ افزودن پیک جدید'}</h3>
                <form onSubmit={handleSubmit} noValidate>

                    {/* ردیف اول: همه فیلدها در یک خط */}
                    <div className="courier-form-row">

                        {/* نام کامل */}
                        <div className="form-group courier-field courier-field-name">
                            <label>نام کامل *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                placeholder="نام و نام خانوادگی"
                            />
                        </div>

                        {/* شماره تماس */}
                        <div className="form-group courier-field courier-field-phone">
                            <label>شماره تماس *</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                inputMode="numeric"
                            />
                        </div>

                        {/* نوع وسیله */}
                        <div className="form-group courier-field courier-field-vehicle">
                            <label>نوع وسیله</label>
                            <select
                                name="vehicleType"
                                value={formData.vehicleType}
                                onChange={handleInputChange}
                            >
                                <option value="MOTORCYCLE">🏍️ موتور</option>
                                <option value="CAR">🚗 خودرو</option>
                            </select>
                        </div>

                        {/* پلاک وسیله */}
                        <div className="form-group courier-field courier-field-plate">
                            <label>پلاک وسیله <span className="required-star">*</span></label>
                            <div className="plate-input compact">
                                <input
                                    type="text"
                                    name="plateTwoDigit"
                                    value={formData.plateTwoDigit}
                                    onChange={handleInputChange}
                                    placeholder="۱۲"
                                    inputMode="numeric"
                                    maxLength={2}
                                    className="plate-input-num"
                                    aria-label="دو رقم"
                                />
                                <select
                                    name="plateLetter"
                                    value={formData.plateLetter}
                                    onChange={handlePlateLetterChange}
                                    className="plate-input-letter"
                                    aria-label="حرف"
                                >
                                    <option value="">—</option>
                                    {PLATE_LETTERS.map((l) => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    name="plateThreeDigit"
                                    value={formData.plateThreeDigit}
                                    onChange={handleInputChange}
                                    placeholder="۳۴۵"
                                    inputMode="numeric"
                                    maxLength={3}
                                    className="plate-input-num"
                                    aria-label="سه رقم"
                                />
                                <span className="plate-iran">ایران</span>
                                <input
                                    type="text"
                                    name="plateProvince"
                                    value={formData.plateProvince}
                                    onChange={handleInputChange}
                                    placeholder="۶۸"
                                    inputMode="numeric"
                                    maxLength={2}
                                    className="plate-input-num"
                                    aria-label="کد استان"
                                />
                            </div>
                        </div>

                        {/* کد ملی */}
                        <div className="form-group courier-field courier-field-national">
                            <label>کد ملی</label>
                            <input
                                type="text"
                                name="nationalId"
                                value={formData.nationalId}
                                onChange={handleInputChange}
                                placeholder="۱۰ رقمی"
                                inputMode="numeric"
                            />
                        </div>
                    </div>

                    {/* ردیف دوم: آدرس + دکمه‌ها */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '10px',
                        marginTop: '10px',
                        flexWrap: 'wrap'
                    }}>
                        {/* فیلد آدرس */}
                        <div className="form-group" style={{
                            flex: '1 1 auto',
                            minWidth: '280px'
                        }}>
                            <label>آدرس پیک <span className="required-star">*</span></label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="مثال: خیابان امام، کوچه شهید فلانی، پلاک ۱۰، واحد ۲"
                                rows="1"
                                className="address-textarea"
                                style={{
                                    resize: 'none',
                                    minHeight: '34px',
                                    height: '34px',
                                    paddingTop: '7px',
                                    paddingBottom: '7px',
                                    lineHeight: '1.4',
                                    overflow: 'auto'
                                }}
                            />
                        </div>

                        {/* دکمه‌ها */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            flexShrink: 0
                        }}>
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={submitLoading}
                                style={btnStyle}
                            >
                                {submitLoading ? '⏳' : editingId ? '✏️ ذخیره' : '➕ افزودن'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={resetForm}
                                    style={{ ...btnStyle, background: '#6B3A2A' }}
                                >
                                    ✖ انصراف
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* ===== جدول ===== */}
            {couriers.length === 0 ? (
                <p className="empty-text">هیچ پیکی ثبت نشده است.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="order-table responsive-cards-table">
                        <thead>
                        <tr>
                            <th>نام و نام خانوادگی</th>
                            <th>شماره تماس</th>
                            <th>وسیله</th>
                            <th>پلاک</th>
                            <th>آدرس</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                        </thead>
                        <tbody>
                        {couriers.map((item) => (
                            <tr key={item.id}>
                                <td data-label="نام و نام خانوادگی">
                                    <strong>{item.fullName}</strong>
                                </td>
                                <td data-label="شماره تماس">
                                    {item.phone ? toPersianNumber(item.phone) : '—'}
                                </td>
                                <td data-label="وسیله">
                                    <span className="role-badge">
                                        {getVehicleLabel(item.vehicleType)}
                                    </span>
                                </td>
                                <td data-label="پلاک">
                                    {item.vehiclePlate ? (
                                        <span className="plate-display">
                                            {displayPlate(item.vehiclePlate)}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td data-label="آدرس">
                                    <span className="address-cell" title={item.address}>
                                        {item.address || '—'}
                                    </span>
                                </td>
                                <td data-label="وضعیت">
                                    <span className={`status-badge ${item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                                        {item.status === 'ACTIVE' ? '✅ فعال' : '❌ غیرفعال'}
                                    </span>
                                </td>
                                <td data-label="عملیات">
                                    <div style={{
                                        display: 'flex',
                                        gap: '4px',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <button
                                            className="action-btn toggle"
                                            onClick={() => handleToggleStatus(item.id, item.status)}
                                            title={item.status === 'ACTIVE' ? 'غیرفعال کردن' : 'فعال کردن'}
                                            style={{
                                                ...actionBtnStyle,
                                                color: item.status === 'ACTIVE' ? '#d32f2f' : '#2e7d32'
                                            }}
                                        >
                                            {item.status === 'ACTIVE' ? '⛔' : '✅'}
                                        </button>
                                        <button
                                            className="action-btn edit"
                                            onClick={() => handleEdit(item)}
                                            title="ویرایش"
                                            style={{ ...actionBtnStyle, color: '#5C3317' }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDelete(item.id, item.fullName)}
                                            title="حذف"
                                            style={{ ...actionBtnStyle, color: '#b71c1c' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Couriers;