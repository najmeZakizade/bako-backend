// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ============================================================
//  صفحات مشتری (Customer)
// ============================================================
import BakeriesPage from './pages/customer/BakeriesPage';
import BakeryDetailPage from './pages/customer/BakeryDetailPage';
import CartPage from './pages/customer/CartPage';
import DeliveryPage from './pages/customer/DeliveryPage';
import PaymentPage from './pages/customer/PaymentPage';
import Receipt from './pages/customer/Receipt';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import MyOrdersPage from './pages/customer/MyOrdersPage';
import ProfilePage from './pages/customer/ProfilePage';

// ============================================================
//  🔔 اعلان‌ها — مشترک
// ============================================================
import NotificationsPage from './pages/NotificationsPage';

// ============================================================
//  صفحه بازگشت از درگاه
// ============================================================
import PaymentCallback from './pages/shared/PaymentCallback';

// ============================================================
//  صفحات احراز هویت
// ============================================================
import LoginPage from './pages/LoginPage';
import PanelSelector from './pages/PanelSelector';

// ============================================================
//  Layouts
// ============================================================
import Navbar from './components/common/Navbar';
import CustomerLayout from './components/layout/CustomerLayout';
import BakeryLayout from './components/layout/BakeryLayout';
import AdminLayout from './components/layout/AdminLayout';
import MonitoringLayout from './components/layout/MonitoringLayout';

// ============================================================
//  پنل ادمین
// ============================================================
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import TenantsManagement from './pages/admin/TenantsManagement';
import TenantPaymentConfig from './pages/admin/TenantPaymentConfig';
import TransactionsPage from './pages/admin/TransactionsPage';
import PaymentStatsPage from './pages/admin/PaymentStatsPage';

// ============================================================
//  پنل مانیتورینگ
// ============================================================
import MonitoringDashboard from './pages/monitoring/MonitoringDashboard';
import MonitoringAlertsPage from './pages/monitoring/MonitoringAlertsPage';
import MonitoringReportsPage from './pages/monitoring/MonitoringReportsPage';
import MonitoringTransactionsPage from './pages/monitoring/MonitoringTransactionsPage';

// ============================================================
//  پنل نانوایی
// ============================================================
import Dashboard from './pages/bakery/Dashboard';
import Orders from './pages/bakery/Orders';
import Products from './pages/bakery/Products';
import Inventory from './pages/bakery/Inventory';
import CounterOrder from './pages/bakery/CounterOrder';
import Reports from './pages/bakery/Reports';
import Staff from './pages/bakery/Staff';
import Couriers from './pages/bakery/Couriers';
import CourierTariff from './pages/bakery/CourierTariff';
import CounterCart from './pages/bakery/CounterCart';
import CounterCourierSelect from './pages/bakery/CounterCourierSelect';
import BakeryReceipt from './pages/bakery/Receipt';
import PaymentMethod from './pages/bakery/PaymentMethod';

import './App.css';

// ============================================================
//  کامپوننت محافظ
// ============================================================
function ProtectedRoute({ children, allowedRoles }) {
    const location = useLocation();
    const token = localStorage.getItem('token');
    let user = null;

    try {
        const userStr = localStorage.getItem('user');
        user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error('❌ خطا در parse user:', e);
        localStorage.removeItem('user');
    }

    if (!token || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const roleRedirects = {
            'CUSTOMER': '/',
            'BAKERY_OWNER': '/bakery/dashboard',
            'MONITOR': '/monitoring/dashboard',
            'SUPER_ADMIN': '/panel-select',
            'STAFF': '/bakery/dashboard',
        };
        const redirect = roleRedirects[user.role] || '/';
        return <Navigate to={redirect} replace />;
    }

    return children;
}

// ============================================================
//  کامپوننت اصلی
// ============================================================
function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>

                {/* ============================================================
                    صفحات مشتری
                    ============================================================ */}
                <Route element={<CustomerLayout />}>
                    <Route path="/" element={<BakeriesPage />} />
                    <Route path="/bakeries/:id" element={<BakeryDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/delivery" element={<DeliveryPage />} />
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/receipt" element={<Receipt />} />
                    <Route path="/receipt/:orderId" element={<Receipt />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                    <Route path="/my-orders" element={<MyOrdersPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Route>

                {/* ============================================================
                    صفحه بازگشت از درگاه
                    ============================================================ */}
                <Route path="/payment/callback" element={<PaymentCallback />} />

                {/* ============================================================
                    صفحه ورود
                    ============================================================ */}
                <Route path="/login" element={<LoginPage />} />

                {/* ============================================================
                    انتخاب پنل
                    ============================================================ */}
                <Route
                    path="/panel-select"
                    element={
                        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                            <PanelSelector />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================================
                    پنل ادمین
                    ============================================================ */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="tenants" element={<TenantsManagement />} />
                    <Route path="payment-config" element={<TenantPaymentConfig />} />
                    <Route
                        path="tenants/:tenantId/payment-config"
                        element={<TenantPaymentConfig />}
                    />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="payment-stats" element={<PaymentStatsPage />} />
                </Route>

                {/* ============================================================
                    پنل مانیتورینگ
                    ============================================================ */}
                <Route
                    path="/monitoring"
                    element={
                        <ProtectedRoute allowedRoles={['MONITOR', 'SUPER_ADMIN']}>
                            <MonitoringLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/monitoring/dashboard" replace />} />
                    <Route path="dashboard" element={<MonitoringDashboard />} />
                    <Route path="alerts" element={<MonitoringAlertsPage />} />
                    <Route path="reports" element={<MonitoringReportsPage />} />
                    <Route path="transactions" element={<MonitoringTransactionsPage />} />
                </Route>

                {/* ============================================================
                    پنل نانوایی
                    ============================================================ */}
                <Route
                    path="/bakery"
                    element={
                        <ProtectedRoute
                            allowedRoles={['BAKERY_OWNER', 'STAFF', 'SUPER_ADMIN']}
                        >
                            <BakeryLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/bakery/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="products" element={<Products />} />
                    <Route path="counter" element={<CounterOrder />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="couriers" element={<Couriers />} />
                    <Route path="courier-tariff" element={<CourierTariff />} />
                    <Route path="counter/cart" element={<CounterCart />} />
                    <Route path="counter/courier" element={<CounterCourierSelect />} />
                    <Route path="counter/payment" element={<PaymentMethod />} />
                    <Route path="counter/receipt" element={<BakeryReceipt />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default App;