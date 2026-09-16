// src/pages/bakery/Staff.jsx
import { useState, useEffect } from 'react';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    disableUser,
    enableUser
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, toEnglishNumber } from '../../utils/format';

function Staff() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        phone: '',
        role: 'STAFF',
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');

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
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const tenantId = getTenantId();
            const res = await getUsers();
            const allUsers = res.data || [];

            const filtered = allUsers.filter(u =>
                u.tenantId === tenantId &&
                u.role !== 'CUSTOMER' &&
                u.role !== 'SUPER_ADMIN'
            );

            const formatted = filtered.map(u => ({
                id: u.id || u._id,
                username: u.username || '',
                fullName: u.fullName || u.username || 'نامشخص',
                phone: u.phone || u.mobile || '',
                role: u.role || 'STAFF',
                status: u.status === 'ACTIVE' || u.enabled === true ? 'ACTIVE' : 'INACTIVE',
            }));

            setStaff(formatted);
            setError('');
        } catch (err) {
            console.error(err);
            setError('خطا در دریافت لیست پرسنل');
            showToast('خطا در دریافت لیست پرسنل', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // شماره تماس رو هم فارسی بپذیر، به انگلیسی برای ارسال تبدیل کن
        const normalized = name === 'phone' ? toEnglishNumber(value) : value;
        setFormData(prev => ({ ...prev, [name]: normalized }));
    };

    const extractErrorMessage = (error) => {
        if (error.response?.data?.errors) {
            const errors = error.response.data.errors;
            if (Array.isArray(errors)) {
                return errors.map(e => e.message || e.defaultMessage || 'خطای اعتبارسنجی').join(' • ');
            }
            if (typeof errors === 'object') {
                return Object.values(errors).flat().join(' • ');
            }
        }
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        return error.message || 'خطا در ارتباط با سرور';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username.trim()) {
            showToast('❌ لطفاً نام کاربری را وارد کنید.', 'error');
            return;
        }
        if (!formData.fullName.trim()) {
            showToast('❌ لطفاً نام کامل را وارد کنید.', 'error');
            return;
        }

        setSubmitLoading(true);
        setError('');

        try {
            const tenantId = getTenantId();
            if (!tenantId) {
                showToast('❌ خطا در شناسایی نانوایی', 'error');
                return;
            }

            const payload = {
                username: formData.username.trim(),
                fullName: formData.fullName.trim(),
                phone: formData.phone?.trim() || '',
                role: formData.role,
                tenantId: tenantId,
            };

            if (editingId) {
                await updateUser(editingId, payload);
                showToast('✅ پرسنل با موفقیت ویرایش شد!', 'success');
            } else {
                payload.password = '123456';
                await createUser(payload);
                showToast('✅ پرسنل جدید اضافه شد!', 'success');
            }

            setFormData({ username: '', fullName: '', phone: '', role: 'STAFF' });
            setEditingId(null);
            await fetchStaff();
        } catch (err) {
            const msg = extractErrorMessage(err);
            setError(msg);
            showToast(`❌ ${msg}`, 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            username: item.username || '',
            fullName: item.fullName || '',
            phone: item.phone || '',
            role: item.role || 'STAFF',
        });
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) {
            try {
                await deleteUser(id);
                await fetchStaff();
                showToast(`✅ پرسنل "${name}" حذف شد.`, 'success');
            } catch (err) {
                showToast('❌ خطا در حذف پرسنل', 'error');
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            if (currentStatus === 'ACTIVE') {
                await disableUser(id);
                showToast('✅ پرسنل غیرفعال شد.', 'success');
            } else {
                await enableUser(id);
                showToast('✅ پرسنل فعال شد.', 'success');
            }
            await fetchStaff();
        } catch (err) {
            showToast('❌ خطا در تغییر وضعیت', 'error');
        }
    };

    const getRoleLabel = (role) => {
        const map = {
            'MANAGER': '👔 مدیر',
            'BAKER': '👨‍🍳 نانوا',
            'CASHIER': '💰 صندوقدار',
            'STAFF': '👤 کارمند',
            'BAKERY_OWNER': '🏪 صاحب نانوایی',
        };
        return map[role] || role;
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
        height: '32px',
        minWidth: '70px',
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
            {error && <div className="error-box">❌ {error}</div>}

            <div className="staff-form">
                <h3>{editingId ? '✏️ ویرایش پرسنل' : '➕ افزودن پرسنل جدید'}</h3>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1', minWidth: '120px' }}>
                            <label>نام کاربری *</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder="نام کاربری"
                            />
                        </div>
                        <div className="form-group" style={{ flex: '1.5', minWidth: '150px' }}>
                            <label>نام کامل *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                placeholder="نام کامل"
                            />
                        </div>
                        <div className="form-group" style={{ flex: '1', minWidth: '120px' }}>
                            <label>شماره تماس</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="تلفن"
                                inputMode="numeric"
                            />
                        </div>
                        <div className="form-group" style={{ flex: '0.8', minWidth: '100px' }}>
                            <label>نقش</label>
                            <select name="role" value={formData.role} onChange={handleInputChange}>
                                <option value="STAFF">کارمند</option>
                                <option value="MANAGER">مدیر</option>
                                <option value="BAKER">نانوا</option>
                                <option value="CASHIER">صندوقدار</option>
                            </select>
                        </div>
                        <div className="form-actions" style={{ display: 'flex', gap: '8px', flex: '0.5', minWidth: '100px' }}>
                            <button type="submit" className="btn-submit" disabled={submitLoading} style={btnStyle}>
                                {submitLoading ? '⏳' : editingId ? '✏️ ذخیره' : '➕ افزودن'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => {
                                        setEditingId(null);
                                        setFormData({ username: '', fullName: '', phone: '', role: 'STAFF' });
                                        setError('');
                                    }}
                                    style={{ ...btnStyle, background: '#6B3A2A' }}
                                >
                                    ✖ انصراف
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {staff.length === 0 ? (
                <p className="empty-text">هیچ پرسنلی ثبت نشده است.</p>
            ) : (
                <table className="order-table">
                    <thead>
                    <tr>
                        <th>نام و نام خانوادگی</th>
                        <th>نام کاربری</th>
                        <th>شماره تماس</th>
                        <th>نقش</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {staff.map((item) => (
                        <tr key={item.id}>
                            <td><strong>{item.fullName}</strong></td>
                            <td>{item.username}</td>
                            <td>{item.phone ? toPersianNumber(item.phone) : '—'}</td>
                            <td><span className="role-badge">{getRoleLabel(item.role)}</span></td>
                            <td>
                                    <span className={`status-badge ${item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                                        {item.status === 'ACTIVE' ? '✅ فعال' : '❌ غیرفعال'}
                                    </span>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                        className="action-btn toggle"
                                        onClick={() => handleToggleStatus(item.id, item.status)}
                                        title={item.status === 'ACTIVE' ? 'غیرفعال کردن' : 'فعال کردن'}
                                        style={{ ...actionBtnStyle, color: item.status === 'ACTIVE' ? '#d32f2f' : '#2e7d32' }}
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
            )}
        </div>
    );
}

export default Staff;