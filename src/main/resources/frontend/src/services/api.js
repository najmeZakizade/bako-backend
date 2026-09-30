// src/services/api.js
import axios from 'axios';

// ============================================================
//  تنظیمات پایه Axios
// ============================================================
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================
//  اینترسپتور برای اضافه کردن توکن JWT
// ============================================================
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ============================================================
//  اینترسپتور برای مدیریت خطاهای احراز هویت
// ============================================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============================================================
//  تابع کمکی — دریافت tenantId از کاربر لاگین شده
// ============================================================
const getUserTenantId = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.tenantId || user.bakeryId || 'BAKERY_1';
        }
    } catch (e) {
        console.error('خطا در دریافت tenantId:', e);
    }
    return 'BAKERY_1';
};

// ============================================================
//  احراز هویت (Auth)
// ============================================================
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// ============================================================
//  چند-نقشی (Multi-Role)
// ============================================================
export const selectRole = (data) => api.post('/auth/select-role', data);
export const getMyRoles = () => api.post('/auth/my-roles');
export const switchRole = (data) => api.post('/auth/switch-role', data);

// ============================================================
//  محصولات (Products)
// ============================================================
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const updateProductStock = (id, data) => api.patch(`/products/${id}/stock`, data);

export const uploadProductImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return await api.post('/products/upload-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        transformRequest: [(data) => data],
    });
};

// ============================================================
//  سفارشات (Orders)
// ============================================================
export const getOrders = async (params) => {
    try {
        return await api.get('/orders', { params });
    } catch (error) {
        console.error('❌ خطا در دریافت سفارشات:', error.message);
        return { data: [] };
    }
};

// 🆕 دریافت سفارشات شخصی کاربر لاگین‌شده (بدون فیلتر tenantId)
export const getMyOrders = async () => {
    try {
        return await api.get('/orders/my');
    } catch (error) {
        console.error('❌ خطا در دریافت سفارشات شخصی:', error.message);
        return { data: [] };
    }
};

export const getOrder = async (id) => {
    try {
        return await api.get(`/orders/${id}`);
    } catch (error) {
        console.error('❌ خطا در دریافت سفارش:', error.message);
        return { data: null };
    }
};

export const createOrder = async (data) => {
    const tenantId = data.tenantId || getUserTenantId();
    const orderData = { ...data, tenantId };
    console.log('📦 داده ارسالی به سرور:', orderData);
    return await api.post('/orders', orderData);
};
export const submitOrder = createOrder;

export const updateOrderStatus = async (id, status) => {
    return await api.patch(`/orders/${id}/status`, null, {
        params: { status }
    });
};

export const cancelOrder = async (id) => {
    return await api.delete(`/orders/${id}`);
};

export const getOrdersByStatus = async (status) => {
    try {
        return await api.get(`/orders/status/${status}`);
    } catch (error) {
        console.error('❌ خطا در دریافت سفارشات بر اساس وضعیت:', error.message);
        return { data: [] };
    }
};

export const getOrdersByPhone = async (phone) => {
    try {
        return await api.get(`/orders/phone/${phone}`);
    } catch (error) {
        console.error('❌ خطا در دریافت سفارشات بر اساس شماره:', error.message);
        return { data: [] };
    }
};

export const markOrderAsReceived = (orderId) =>
    api.patch(`/orders/${orderId}/customer-received`);

// ============================================================
//  🔔 اعلان‌ها (Notifications)
// ============================================================
export const getNotifications = () => api.get('/notifications');
export const getUnreadNotificationCount = () =>
    api.get('/notifications/unread-count');
export const markNotificationAsRead = (id) =>
    api.patch(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () =>
    api.patch('/notifications/read-all');

// ============================================================
//  محاسبه هزینه ارسال
// ============================================================
export const calculateDelivery = async (data) => {
    return await api.post('/orders/calculate-delivery', data);
};

// ============================================================
//  تخصیص پیک به سفارش
// ============================================================
export const assignCourierToOrder = async (orderId, courierId) => {
    return await api.post(`/orders/${orderId}/assign-courier`, { courierId });
};

export const unassignCourierFromOrder = async (orderId) => {
    return await api.delete(`/orders/${orderId}/assign-courier`);
};

export const markOrderAsDelivered = async (orderId) => {
    return await api.patch(`/orders/${orderId}/mark-delivered`);
};

// ============================================================
//  پرداخت (Payment)
// ============================================================
export const requestOnlinePayment = async (orderId, amount) => {
    return await api.post(`/orders/${orderId}/payment/request`, { amount });
};

export const verifyOnlinePayment = async (orderId, data) => {
    return await api.post(`/orders/${orderId}/payment/verify`, data);
};

export const updatePaymentMethod = async (orderId, paymentMethod) => {
    return await api.patch(`/orders/${orderId}/payment-method`, {
        paymentMethod,
    });
};

// ============================================================
//  پرداخت چند-درگاهی (Multi-Gateway Payment)
// ============================================================
export const getAvailablePaymentGateways = async () => {
    return await api.get('/admin/payment-gateways');
};

export const getPaymentInfo = async (orderId) => {
    return await api.get(`/orders/${orderId}/payment`);
};

export const inquiryPayment = async (orderId) => {
    return await api.post(`/orders/${orderId}/payment/inquiry`);
};

export const refundPayment = async (orderId, reason) => {
    return await api.post(`/orders/${orderId}/payment/refund`, { reason });
};

// ============================================================
//  روش‌های پرداخت نانوایی (Public — برای مشتری)
// ============================================================
export const getTenantPaymentMethods = (tenantId) =>
    api.get(`/public/bakeries/${tenantId}/payment-methods`);

// ============================================================
//  نام نانوایی (Public)
// ============================================================
export const getTenantName = (tenantId) =>
    api.get(`/public/bakeries/${tenantId}/name`);

// ============================================================
//  ادمین — مدیریت نانوایی‌ها (Tenants)
// ============================================================
export const getAllTenants = async () => {
    return await api.get('/admin/tenants');
};

export const getTenantById = async (tenantId) => {
    return await api.get(`/admin/tenants/${tenantId}`);
};

export const createTenant = async (data) => {
    return await api.post('/admin/tenants', data);
};

export const updateTenant = async (tenantId, data) => {
    return await api.put(`/admin/tenants/${tenantId}`, data);
};

export const deleteTenant = async (tenantId) => {
    return await api.delete(`/admin/tenants/${tenantId}`);
};

export const toggleTenantStatus = async (tenantId, enabled) => {
    return await api.patch(`/admin/tenants/${tenantId}/status`, { enabled });
};

// ============================================================
//  تنظیمات پرداخت نانوایی (Per-Tenant Payment Config)
// ============================================================
export const getTenantPaymentConfig = async (tenantId) => {
    return await api.get(`/admin/tenants/${tenantId}/payment-config`);
};

export const updateTenantPaymentConfig = async (tenantId, config) => {
    return await api.put(
        `/admin/tenants/${tenantId}/payment-config`,
        config
    );
};

export const testTenantPaymentConnection = async (tenantId) => {
    return await api.post(
        `/admin/tenants/${tenantId}/payment-config/test`
    );
};

export const toggleTenantPaymentEnabled = async (tenantId, enabled) => {
    return await api.patch(
        `/admin/tenants/${tenantId}/payment-config/status`,
        { enabled }
    );
};

export const getTenantPaymentStats = async (tenantId, params = {}) => {
    return await api.get(
        `/admin/tenants/${tenantId}/payment-stats`,
        { params }
    );
};

export const getTenantTransactions = async (tenantId, params = {}) => {
    return await api.get(
        `/admin/tenants/${tenantId}/transactions`,
        { params }
    );
};

// ============================================================
//  گزارش تراکنش‌های کلی (Admin)
// ============================================================
export const getAllTransactions = async (params = {}) => {
    return await api.get('/admin/transactions', { params });
};

export const getPaymentStatistics = async (params = {}) => {
    return await api.get('/admin/payment-stats', { params });
};

// ============================================================
//  سبد خرید (Cart)
// ============================================================
export const getCartItems = (tenantId) => {
    const params = tenantId ? { tenantId } : {};
    return api.get('/cart/items', { params });
};

export const getCart = () => api.get('/cart');
export const getCartCount = () => api.get('/cart/count');

export const addToCart = (productId, quantity = 1, tenantId = null) => {
    const body = { productId, quantity };
    if (tenantId) body.tenantId = tenantId;
    return api.post('/cart/items', body);
};

export const updateCartItem = (productId, value, isDelta = true) => {
    const body = isDelta ? { delta: value } : { quantity: value };
    return api.put(`/cart/items/${productId}`, body);
};

export const removeFromCart = (productId) =>
    api.delete(`/cart/items/${productId}`);

export const clearCart = (tenantId) => {
    const params = tenantId ? { tenantId } : {};
    return api.delete('/cart', { params });
};

// ============================================================
//  پروفایل کاربر جاری
// ============================================================
export const getMyProfile = () => api.get('/users/me');
export const updateMyProfile = (data) => api.put('/users/me', data);

// ============================================================
//  آدرس‌های من
// ============================================================
export const getMyAddresses = () => api.get('/addresses');
export const getMyAddress = (addressId) => api.get(`/addresses/${addressId}`);
export const addMyAddress = (address) => api.post('/addresses', address);
export const updateMyAddress = (addressId, address) =>
    api.put(`/addresses/${addressId}`, address);
export const deleteMyAddress = (addressId) =>
    api.delete(`/addresses/${addressId}`);
export const setDefaultAddress = (addressId) =>
    api.patch(`/addresses/${addressId}/default`);

// ============================================================
//  نانوایی (Bakery / Tenant)
// ============================================================
export const getBakeries = () => api.get('/bakeries');
export const getBakery = (id) => api.get(`/bakeries/${id}`);
export const createBakery = (data) => api.post('/bakeries', data);
export const updateBakery = (id, data) => api.put(`/bakeries/${id}`, data);
export const deleteBakery = (id) => api.delete(`/bakeries/${id}`);

// ============================================================
//  تعرفه پیک نانوایی
// ============================================================
export const getCourierTariff = async (tenantId) => {
    const tid = tenantId || getUserTenantId();
    return await api.get(`/admin/tenants/${tid}/courier-tariff`);
};

export const updateCourierTariff = async (tariffData, tenantId) => {
    const tid = tenantId || getUserTenantId();
    return await api.put(`/admin/tenants/${tid}/courier-tariff`, tariffData);
};

export const getTenantLocation = async (tenantId) => {
    const tid = tenantId || getUserTenantId();
    return await api.get(`/admin/tenants/${tid}/location`);
};

export const updateTenantLocation = async (locationData, tenantId) => {
    const tid = tenantId || getUserTenantId();
    return await api.put(`/admin/tenants/${tid}/location`, locationData);
};

// ============================================================
//  گزارشات (Reports)
// ============================================================
export const getSalesReport = (params) => api.get('/reports/sales', { params });
export const getProductReport = (params) => api.get('/reports/products', { params });
export const getOrderReport = (params) => api.get('/reports/orders', { params });

// ============================================================
//  کاربران (Users)
// ============================================================
export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const disableUser = (id) => api.patch(`/users/${id}/disable`);
export const enableUser = (id) => api.patch(`/users/${id}/enable`);

// ============================================================
//  پرسنل (Staff)
// ============================================================
export const getStaff = () => api.get('/staff');
export const createStaff = (data) => api.post('/staff', data);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);
export const disableStaff = (id) => api.patch(`/staff/${id}/disable`);
export const enableStaff = (id) => api.patch(`/staff/${id}/enable`);

// ============================================================
//  پیک (Couriers)
// ============================================================
export const getCouriers = () => api.get('/couriers');
export const getCourier = (id) => api.get(`/couriers/${id}`);
export const createCourier = (data) => api.post('/couriers', data);
export const updateCourier = (id, data) => api.put(`/couriers/${id}`, data);
export const deleteCourier = (id) => api.delete(`/couriers/${id}`);
export const disableCourier = (id) => api.patch(`/couriers/${id}/disable`);
export const enableCourier = (id) => api.patch(`/couriers/${id}/enable`);

// ============================================================
//  🆕 SUPER ADMIN API
// ============================================================

export const getSuperAdminDashboardStats = () =>
    api.get('/super-admin/dashboard/stats');

export const getSuperAdminRevenueTimeline = (days = 7) =>
    api.get('/super-admin/dashboard/revenue-timeline', { params: { days } });

export const getSuperAdminTopTenants = (limit = 5) =>
    api.get('/super-admin/dashboard/top-tenants', { params: { limit } });

export const getSuperAdminRevenueByTenant = () =>
    api.get('/super-admin/reports/revenue-by-tenant');

export const getSuperAdminTopProducts = (limit = 10) =>
    api.get('/super-admin/reports/top-products', { params: { limit } });

export const getSuperAdminUsers = (params = {}) =>
    api.get('/super-admin/users', { params });

export const updateSuperAdminUserRole = (id, role) =>
    api.patch(`/super-admin/users/${id}/role`, { role });

export const updateSuperAdminUserTenant = (id, tenantId) =>
    api.patch(`/super-admin/users/${id}/tenant`, { tenantId });

export const toggleSuperAdminUserEnabled = (id, enabled) =>
    api.patch(`/super-admin/users/${id}/enabled`, { enabled });

export const deleteSuperAdminUser = (id) =>
    api.delete(`/super-admin/users/${id}`);

export const updateSuperAdminTenant = (id, data) =>
    api.put(`/super-admin/tenants/${id}`, data);

export const getSuperAdminTransactions = (params = {}) =>
    api.get('/super-admin/transactions', { params });

// ============================================================
//  🆕 MONITORING API — پنل مانیتورینگ
// ============================================================

export const getMonitoringDashboardStats = () =>
    api.get('/monitoring/dashboard/stats');

export const getMonitoringRevenueTimeline = (days = 7) =>
    api.get('/monitoring/dashboard/revenue-timeline', { params: { days } });

export const getMonitoringTopTenants = (limit = 5) =>
    api.get('/monitoring/dashboard/top-tenants', { params: { limit } });

export const getMonitoringRevenueByTenant = () =>
    api.get('/monitoring/reports/revenue-by-tenant');

export const getMonitoringTopProducts = (limit = 10) =>
    api.get('/monitoring/reports/top-products', { params: { limit } });

export const getMonitoringTransactions = (params = {}) =>
    api.get('/monitoring/transactions', { params });

export const getMonitoringAlerts = () =>
    api.get('/monitoring/alerts');

// ============================================================
//  خروجی پیش‌فرض
// ============================================================
export default api;