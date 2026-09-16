// src/pages/admin/UserManagement.jsx
import { useState, useEffect, useMemo } from 'react';
import {
    getSuperAdminUsers,
    updateSuperAdminUserRole,
    updateSuperAdminUserTenant,
    toggleSuperAdminUserEnabled,
    deleteSuperAdminUser,
    getAllTenants,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber } from '../../utils/format';
import ConfirmModal from '../../components/common/ConfirmModal';
import '../../styles/super-admin.css';

// ===== نقش‌های قابل انتخاب =====
const ROLES = [
    { value: 'SUPER_ADMIN', label: 'سوپر ادمین' },
    { value: 'BAKERY_OWNER', label: 'صاحب نانوایی' },
    { value: 'STAFF', label: 'کارمند' },
    { value: 'CUSTOMER', label: 'مشتری' },
    { value: 'MONITOR', label: 'ناظر' },
];

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [iconError, setIconError] = useState(false);

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [tenantFilter, setTenantFilter] = useState('');

    const [deleteTarget, setDeleteTarget] = useState(null);

    // ============================================================
    //  بارگذاری
    // ============================================================
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [usersRes, tenantsRes] = await Promise.all([
                    getSuperAdminUsers(),
                    getAllTenants(),
                ]);
                setUsers(usersRes.data || []);
                setTenants(tenantsRes.data || []);
            } catch (err) {
                console.error('❌ خطا در دریافت اطلاعات:', err);
                showToast('خطا در دریافت اطلاعات کاربران', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ============================================================
    //  فیلتر
    // ============================================================
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            if (roleFilter && u.role !== roleFilter) return false;
            if (tenantFilter && u.tenantId !== tenantFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                const match =
                    (u.username || '').toLowerCase().includes(s) ||
                    (u.fullName || '').toLowerCase().includes(s) ||
                    (u.phone || '').includes(s) ||
                    (u.email || '').toLowerCase().includes(s);
                if (!match) return false;
            }
            return true;
        });
    }, [users, roleFilter, tenantFilter, search]);

    // ============================================================
    //  تغییر نقش
    // ============================================================
    const handleRoleChange = async (userId, newRole) => {
        setSaving(true);
        try {
            const { data } = await updateSuperAdminUserRole(userId, newRole);
            setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
            showToast('نقش کاربر با موفقیت تغییر کرد', 'success');
        } catch (err) {
            console.error('خطا در تغییر نقش:', err);
            showToast(err.response?.data?.error || 'خطا در تغییر نقش', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ============================================================
    //  تغییر نانوایی
    // ============================================================
    const handleTenantChange = async (userId, newTenantId) => {
        setSaving(true);
        try {
            const { data } = await updateSuperAdminUserTenant(userId, newTenantId || null);
            setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
            showToast('نانوایی کاربر با موفقیت تغییر کرد', 'success');
        } catch (err) {
            console.error('خطا در تغییر نانوایی:', err);
            showToast(err.response?.data?.error || 'خطا در تغییر نانوایی', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ============================================================
    //  فعال/غیرفعال
    // ============================================================
    const handleToggleEnabled = async (user) => {
        setSaving(true);
        try {
            const { data } = await toggleSuperAdminUserEnabled(user.id, !user.enabled);
            setUsers((prev) => prev.map((u) => (u.id === user.id ? data : u)));
            showToast(!user.enabled ? 'کاربر فعال شد' : 'کاربر غیرفعال شد', 'success');
        } catch (err) {
            console.error('خطا در تغییر وضعیت:', err);
            showToast(err.response?.data?.error || 'خطا در تغییر وضعیت', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ============================================================
    //  حذف
    // ============================================================
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            await deleteSuperAdminUser(deleteTarget.id);
            setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
            showToast('کاربر حذف شد', 'success');
            setDeleteTarget(null);
        } catch (err) {
            console.error('خطا در حذف:', err);
            showToast(err.response?.data?.error || 'خطا در حذف کاربر', 'error');
        } finally {
            setSaving(false);
        }
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
        <div className="admin-users-page">
            <div className="admin-dashboard-header">
                <h1>
                    {!iconError ? (
                        <img
                            src="/admin-sidebar-icons/users.png"
                            alt="کاربران"
                            className="admin-header-icon"
                            onError={() => setIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">👥</span>
                    )}
                    مدیریت کاربران
                </h1>
                <p className="admin-subtitle">
                    {toPersianNumber(filteredUsers.length)} کاربر
                </p>
            </div>

            {/* نوار ابزار */}
            <div className="admin-toolbar">
                <div className="admin-search-box">
                    <span className="admin-search-icon">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس نام، نام کاربری، موبایل یا ایمیل..."
                        className="admin-search-input"
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="admin-filter-select"
                >
                    <option value="">همه نقش‌ها</option>
                    {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>

                <select
                    value={tenantFilter}
                    onChange={(e) => setTenantFilter(e.target.value)}
                    className="admin-filter-select"
                >
                    <option value="">همه نانوایی‌ها</option>
                    {tenants.map((t) => {
                        const id = t._id || t.id;
                        return (
                            <option key={id} value={id}>
                                {t.name}
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* جدول */}
            {filteredUsers.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">👥</span>
                    <h3>کاربری یافت نشد</h3>
                    <p>
                        {search || roleFilter || tenantFilter
                            ? 'فیلترها را تغییر دهید'
                            : 'هنوز کاربری ثبت نشده است'}
                    </p>
                </div>
            ) : (
                <div className="sa-table-wrapper">
                    <table className="sa-table">
                        <thead>
                        <tr>
                            <th>نام کاربری</th>
                            <th>نام کامل</th>
                            <th>موبایل</th>
                            <th>نقش</th>
                            <th>نانوایی</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td className="sa-cell-username">
                                    {user.username}
                                </td>

                                <td>{user.fullName || '—'}</td>

                                {/* موبایل — اعداد فارسی با فونت اصلی سایت */}
                                <td className="sa-cell-phone">
                                    {user.phone
                                        ? toPersianNumber(user.phone)
                                        : '—'}
                                </td>

                                <td>
                                    <select
                                        className="sa-inline-select"
                                        value={user.role}
                                        onChange={(e) =>
                                            handleRoleChange(
                                                user.id,
                                                e.target.value
                                            )
                                        }
                                        disabled={saving}
                                    >
                                        {ROLES.map((r) => (
                                            <option
                                                key={r.value}
                                                value={r.value}
                                            >
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>

                                <td>
                                    <select
                                        className="sa-inline-select"
                                        value={user.tenantId || ''}
                                        onChange={(e) =>
                                            handleTenantChange(
                                                user.id,
                                                e.target.value
                                            )
                                        }
                                        disabled={saving}
                                    >
                                        <option value="">
                                            بدون نانوایی
                                        </option>
                                        {tenants.map((t) => {
                                            const id = t._id || t.id;
                                            return (
                                                <option
                                                    key={id}
                                                    value={id}
                                                >
                                                    {t.name}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </td>

                                <td>
                                    <button
                                        type="button"
                                        className={`sa-status-icon ${
                                            user.enabled
                                                ? 'sa-status-icon-on'
                                                : 'sa-status-icon-off'
                                        }`}
                                        onClick={() =>
                                            handleToggleEnabled(user)
                                        }
                                        disabled={saving}
                                        title={
                                            user.enabled
                                                ? 'غیرفعال کردن'
                                                : 'فعال کردن'
                                        }
                                    >
                                        {user.enabled ? '✓' : '✗'}
                                    </button>
                                </td>

                                <td>
                                    <div className="sa-actions">
                                        <button
                                            type="button"
                                            className="sa-btn-icon sa-btn-danger"
                                            onClick={() =>
                                                setDeleteTarget(user)
                                            }
                                            disabled={
                                                saving ||
                                                user.role ===
                                                'SUPER_ADMIN'
                                            }
                                            title="حذف"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmModal
                show={!!deleteTarget}
                title="حذف کاربر"
                message={
                    deleteTarget
                        ? `آیا از حذف کاربر «${deleteTarget.username}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`
                        : ''
                }
                confirmText="حذف کن"
                cancelText="انصراف"
                icon="🗑"
                variant="danger"
                loading={saving}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default UserManagement;