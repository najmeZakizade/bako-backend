// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, register } from '../services/api';
import { showToast } from '../utils/toast';
import { toEnglishNumber } from '../utils/format';
import './LoginPage.css';

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);

    const [loginForm, setLoginForm] = useState({
        username: '',
        password: '',
    });

    // 🎯 نوع حساب حذف شد — همیشه CUSTOMER برای ثبت‌نام جدید
    const [registerForm, setRegisterForm] = useState({
        fullName: '',
        username: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    /* ============================================================
       🎯 Force override — اجازه‌ی اسکرول به صفحه لاگین
       چون App.css از `body:has(.login-page) { overflow: hidden }` استفاده می‌کنه
       ============================================================ */
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;

        const prev = {
            htmlOverflow: html.style.overflow,
            htmlHeight: html.style.height,
            bodyOverflow: body.style.overflow,
            bodyHeight: body.style.height,
            bodyMinHeight: body.style.minHeight,
        };

        html.style.overflow = 'auto';
        html.style.height = 'auto';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        body.style.minHeight = '100vh';

        return () => {
            html.style.overflow = prev.htmlOverflow;
            html.style.height = prev.htmlHeight;
            body.style.overflow = prev.bodyOverflow;
            body.style.height = prev.bodyHeight;
            body.style.minHeight = prev.bodyMinHeight;
        };
    }, []);

    /* ============================================================
       استخراج کاربر از پاسخ سرور — پشتیبانی از همه ساختارها
       ============================================================ */
    const extractUser = (data) => {
        console.log('🔍 پاسخ خام سرور:', data);

        if (!data || typeof data !== 'object') {
            console.warn('⚠️ پاسخ سرور معتبر نیست');
            return {};
        }

        // ===== حالت ۱: data.user موجوده و role داره =====
        if (data.user && (data.user.role || data.user.username)) {
            console.log('✅ حالت ۱: data.user پیدا شد');
            return {
                id: data.user.id || data.user._id,
                username: data.user.username,
                role: data.user.role,
                fullName: data.user.fullName || data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                tenantId: data.user.tenantId || data.user.bakeryId,
                ...data.user,
            };
        }

        // ===== حالت ۲: role مستقیم در data (flat) =====
        if (data.role) {
            console.log('✅ حالت ۲: role در ریشه پاسخ پیدا شد (flat)');
            return {
                id: data.id || data._id,
                username: data.username,
                role: data.role,
                fullName: data.fullName || data.name,
                email: data.email,
                phone: data.phone,
                tenantId: data.tenantId || data.bakeryId,
            };
        }

        // ===== حالت ۳: data.user ولی role داخلش نیست =====
        if (data.user) {
            console.log('⚠️ حالت ۳: data.user هست ولی role نداره');
            return { ...data.user };
        }

        console.warn('❌ هیچ کاربری در پاسخ پیدا نشد');
        return {};
    };

    /* ============================================================
       دریافت role از همه منابع ممکن
       ============================================================ */
    const getUserRole = (user) => {
        if (user?.role) return String(user.role).toUpperCase();

        try {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            if (stored?.role) return String(stored.role).toUpperCase();
        } catch {}

        return null;
    };

    /* ============================================================
       مسیریابی بر اساس نقش
       ============================================================ */
    const redirectByRole = (user) => {
        const role = getUserRole(user);
        console.log('🎯 نقش کاربر:', role);
        console.log('👤 اطلاعات کاربر:', user);

        const from = location.state?.from?.pathname;

        if (from && from !== '/login' && role !== 'SUPER_ADMIN') {
            console.log('↩️ بازگشت به مسیر قبلی:', from);
            navigate(from, { replace: true });
            return;
        }

        const roleRedirects = {
            'SUPER_ADMIN': '/panel-select',
            'CUSTOMER': '/',
            'BAKERY_OWNER': '/bakery/dashboard',
            'MONITOR': '/monitoring/dashboard',
            'STAFF': '/bakery/dashboard',
        };

        const target = roleRedirects[role] || '/';
        console.log('🚀 هدایت به:', target);

        navigate(target, { replace: true });
    };

    /* ============================================================
       اگر کاربر از قبل لاگین کرده → مستقیم به پنل خودش
       ============================================================ */
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                console.log('🔑 کاربر از قبل لاگین بود:', user);
                redirectByRole(user);
            } catch (e) {
                console.error('خطا در parse user:', e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ============================================================
       تغییر بین تب‌ها
       ============================================================ */
    const switchTab = (tab) => {
        setActiveTab(tab);
        setLoading(false);
    };

    /* ============================================================
       ورود
       ============================================================ */
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!loginForm.username.trim() || !loginForm.password) {
            showToast('لطفاً نام کاربری و رمز عبور را وارد کنید.', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await login({
                username: loginForm.username.trim(),
                password: loginForm.password,
            });

            console.log('📥 پاسخ کامل login:', response);
            const data = response?.data || {};

            if (!data.token) {
                showToast(
                    data.message || 'نام کاربری یا رمز عبور نادرست است.',
                    'error'
                );
                setLoading(false);
                return;
            }

            const user = extractUser(data);

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(user));

            console.log('💾 کاربر ذخیره شد:', user);

            showToast(
                `خوش آمدید، ${user.fullName || user.username || ''}`,
                'success'
            );

            setTimeout(() => redirectByRole(user), 400);
        } catch (err) {
            console.error('❌ خطا در ورود:', err);
            const errData = err.response?.data || {};
            const msg =
                errData.error ||
                errData.message ||
                err.message ||
                'نام کاربری یا رمز عبور نادرست است.';
            showToast(msg, 'error');
            setLoading(false);
        }
    };

    /* ============================================================
       ثبت‌نام — با چک تکراری نبودن شماره موبایل
       🎯 نقش همیشه CUSTOMER — ادمین بعداً می‌تونه تغییر بده
       ============================================================ */
    const handleRegister = async (e) => {
        e.preventDefault();

        const { fullName, username, phone, password, confirmPassword } =
            registerForm;

        // ===== اعتبارسنجی پایه =====
        if (
            !fullName.trim() ||
            !username.trim() ||
            !phone.trim() ||
            !password
        ) {
            showToast('لطفاً همه فیلدها را پر کنید.', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('رمز عبور باید حداقل ۶ کاراکتر باشد.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showToast('تکرار رمز عبور مطابقت ندارد.', 'error');
            return;
        }

        // 🆕 اعتبارسنجی فرمت شماره موبایل
        const cleanPhone = phone.trim();
        if (!/^09\d{9}$/.test(cleanPhone)) {
            showToast(
                'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد.',
                'error'
            );
            return;
        }

        setLoading(true);
        try {
            const response = await register({
                fullName: fullName.trim(),
                username: username.trim(),
                phone: cleanPhone,
                password,
                role: 'CUSTOMER',
            });

            const data = response?.data || {};

            if (data.token) {
                const user = extractUser(data);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(user));
                showToast('ثبت‌نام با موفقیت انجام شد.', 'success');
                setTimeout(() => redirectByRole(user), 400);
            } else {
                showToast('ثبت‌نام موفق بود. حالا وارد شوید.', 'success');
                setActiveTab('login');
                setLoginForm({
                    username: registerForm.username,
                    password: '',
                });
                setLoading(false);
            }
        } catch (err) {
            console.error('❌ خطا در ثبت‌نام:', err);

            // 🆕 استخراج پیام خطای دقیق‌تر از پاسخ سرور
            const errData = err.response?.data || {};
            const errMessage =
                errData.error ||
                errData.message ||
                err.message ||
                'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.';

            showToast(errMessage, 'error');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">

                <div className="login-brand">
                    <img
                        src="/bakoLogo.png"
                        alt="بیکو"
                        className="brand-logo"
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                    <h1>بیکو</h1>
                    <p>هر روز، نان تازه</p>
                </div>

                <div className="login-tabs">
                    <button
                        type="button"
                        className={`tab-btn ${
                            activeTab === 'login' ? 'active' : ''
                        }`}
                        onClick={() => switchTab('login')}
                        disabled={loading}
                    >
                        ورود
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${
                            activeTab === 'register' ? 'active' : ''
                        }`}
                        onClick={() => switchTab('register')}
                        disabled={loading}
                    >
                        ثبت‌نام
                    </button>
                </div>

                {activeTab === 'login' && (
                    <form
                        className="login-form"
                        onSubmit={handleLogin}
                        noValidate
                    >
                        <div className="form-group">
                            <label>نام کاربری</label>
                            <input
                                type="text"
                                value={loginForm.username}
                                onChange={(e) =>
                                    setLoginForm((prev) => ({
                                        ...prev,
                                        username: e.target.value,
                                    }))
                                }
                                placeholder="نام کاربری خود را وارد کنید"
                                autoComplete="username"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>رمز عبور</label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) =>
                                    setLoginForm((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                placeholder="رمز عبور خود را وارد کنید"
                                autoComplete="current-password"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading ? '⏳ در حال ورود...' : 'ورود به حساب'}
                        </button>
                    </form>
                )}

                {activeTab === 'register' && (
                    <form
                        className="login-form"
                        onSubmit={handleRegister}
                        noValidate
                    >
                        <div className="form-group">
                            <label>نام و نام خانوادگی</label>
                            <input
                                type="text"
                                value={registerForm.fullName}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({
                                        ...prev,
                                        fullName: e.target.value,
                                    }))
                                }
                                placeholder="مثال: علی محمدی"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>نام کاربری</label>
                            <input
                                type="text"
                                value={registerForm.username}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({
                                        ...prev,
                                        username: e.target.value,
                                    }))
                                }
                                placeholder="یک نام کاربری انتخاب کنید"
                                autoComplete="username"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>شماره موبایل</label>
                            <input
                                type="tel"
                                value={registerForm.phone}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({
                                        ...prev,
                                        phone: toEnglishNumber(
                                            e.target.value
                                        ),
                                    }))
                                }
                                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                inputMode="numeric"
                                maxLength={11}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>رمز عبور</label>
                            <input
                                type="password"
                                value={registerForm.password}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                placeholder="حداقل ۶ کاراکتر"
                                autoComplete="new-password"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>تکرار رمز عبور</label>
                            <input
                                type="password"
                                value={registerForm.confirmPassword}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({
                                        ...prev,
                                        confirmPassword: e.target.value,
                                    }))
                                }
                                placeholder="رمز عبور را دوباره وارد کنید"
                                autoComplete="new-password"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading
                                ? '⏳ در حال ثبت‌نام...'
                                : 'ثبت‌نام'}
                        </button>
                    </form>
                )}

                <div className="login-footer">
                    {activeTab === 'login' ? (
                        <>
                            حساب ندارید؟{' '}
                            <button
                                type="button"
                                className="switch-btn"
                                onClick={() => switchTab('register')}
                                disabled={loading}
                            >
                                ثبت‌نام کنید
                            </button>
                        </>
                    ) : (
                        <>
                            قبلاً ثبت‌نام کرده‌اید؟{' '}
                            <button
                                type="button"
                                className="switch-btn"
                                onClick={() => switchTab('login')}
                                disabled={loading}
                            >
                                وارد شوید
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

export default LoginPage;