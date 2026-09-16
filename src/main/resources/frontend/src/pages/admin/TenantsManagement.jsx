// src/pages/admin/TenantsManagement.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTenants } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber } from '../../utils/format';
import TenantEditModal from '../../components/admin/TenantEditModal';
import '../../styles/super-admin.css';

// ============================================================
//  لوگوی نانوایی
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
        return <span className="admin-tenant-card-icon-emoji">🏪</span>;
    }

    const src = mode === 'logo' ? tenant.logoUrl : tenant.coverImageUrl;

    return (
        <img
            src={src}
            alt={tenant.name || 'نانوایی'}
            className="admin-tenant-card-icon-img"
            onError={handleError}
            draggable={false}
        />
    );
}

// ============================================================
//  صفحه اصلی
// ============================================================
function TenantsManagement() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [iconError, setIconError] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);

    const loadTenants = async () => {
        try {
            setLoading(true);
            const res = await getAllTenants();
            setTenants(res.data || []);
        } catch (err) {
            console.error('❌ خطا در دریافت نانوایی‌ها:', err);
            showToast('خطا در دریافت لیست نانوایی‌ها', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
    }, []);

    const filteredTenants = tenants.filter((tenant) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
            (tenant.name || '').toLowerCase().includes(term) ||
            (tenant.address || '').toLowerCase().includes(term)
        );
    });

    const handleSaved = (updatedTenant) => {
        setTenants((prev) =>
            prev.map((t) => {
                const tId = t._id || t.id;
                const uId = updatedTenant.id || updatedTenant._id;
                return tId === uId ? { ...t, ...updatedTenant } : t;
            })
        );
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
        <div className="tenants-management">
            <div className="admin-dashboard-header">
                <h1>
                    {!iconError ? (
                        <img
                            src="/admin-sidebar-icons/tenants.png"
                            alt="نانوایی‌ها"
                            className="admin-header-icon"
                            onError={() => setIconError(true)}
                        />
                    ) : (
                        <span className="admin-header-icon-fallback">🏪</span>
                    )}
                    مدیریت نانوایی‌ها
                </h1>
                <p className="admin-subtitle">
                    {toPersianNumber(filteredTenants.length)} نانوایی
                </p>
            </div>

            <div className="admin-toolbar">
                <div className="admin-search-box">
                    <span className="admin-search-icon">🔍</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="جستجو بر اساس نام یا آدرس..."
                        className="admin-search-input"
                    />
                </div>
            </div>

            {filteredTenants.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">🏪</span>
                    <h3>نانوایی‌ای یافت نشد</h3>
                    <p>
                        {searchTerm
                            ? 'جستجوی خود را تغییر دهید'
                            : 'هنوز نانوایی‌ای ثبت نشده است'}
                    </p>
                </div>
            ) : (
                <div className="admin-tenants-grid">
                    {filteredTenants.map((tenant) => {
                        const id = tenant._id || tenant.id;
                        return (
                            <div key={id} className="admin-tenant-card">
                                <div className="admin-tenant-card-header">
                                    <div className="admin-tenant-card-icon">
                                        <TenantLogo tenant={tenant} />
                                    </div>
                                    <div className="admin-tenant-card-info">
                                        <h3 className="admin-tenant-card-name">
                                            {tenant.name}
                                        </h3>
                                        <p className="admin-tenant-card-address">
                                            {tenant.address || 'آدرس ثبت نشده'}
                                        </p>
                                    </div>
                                </div>

                                <div className="admin-tenant-card-body">
                                    <div className="admin-tenant-card-row">
                                        <span className="label">وضعیت:</span>
                                        <span
                                            className={`status-badge ${
                                                tenant.enabled !== false
                                                    ? 'active'
                                                    : 'inactive'
                                            }`}
                                        >
                                            {tenant.enabled !== false
                                                ? '✅ فعال'
                                                : '⛔ غیرفعال'}
                                        </span>
                                    </div>
                                    <div className="admin-tenant-card-row">
                                        <span className="label">
                                            درگاه پرداخت:
                                        </span>
                                        <span
                                            className={`status-badge ${
                                                tenant.zarinpalEnabled
                                                    ? 'active'
                                                    : 'inactive'
                                            }`}
                                        >
                                            {tenant.zarinpalEnabled
                                                ? '✅ فعال'
                                                : '⛔ غیرفعال'}
                                        </span>
                                    </div>
                                    <div className="admin-tenant-card-row">
                                        <span className="label">
                                            تعداد محصولات:
                                        </span>
                                        <span className="value">
                                            {toPersianNumber(
                                                tenant.productCount || 0
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="admin-tenant-card-footer">
                                    <button
                                        className="btn-edit"
                                        onClick={() => setEditingTenant(tenant)}
                                    >
                                        ✏️ ویرایش
                                    </button>
                                    <button
                                        className="btn-payment"
                                        onClick={() =>
                                            navigate(
                                                `/admin/tenants/${id}/payment-config`
                                            )
                                        }
                                    >
                                        💳 پرداخت
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== مودال ویرایش ===== */}
            <TenantEditModal
                show={!!editingTenant}
                tenant={editingTenant}
                onClose={() => setEditingTenant(null)}
                onSaved={handleSaved}
            />
        </div>
    );
}

export default TenantsManagement;