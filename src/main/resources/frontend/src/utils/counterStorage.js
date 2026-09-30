// src/utils/counterStorage.js
/* ============================================================
   🎯 کلیدهای localStorage مشترک برای پنل نانوایی
   به‌ازای هر نانوایی (tenantId) جدا می‌شوند
   ============================================================ */

export const getTenantId = () => {
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

export const getCartKey = () => {
    const tid = getTenantId();
    return tid ? `bako_counter_cart_${tid}` : 'bako_counter_cart_guest';
};

export const getCheckoutKey = () => {
    const tid = getTenantId();
    return tid ? `bako_counter_checkout_${tid}` : 'bako_counter_checkout_guest';
};

export const getLastOrderKey = () => {
    const tid = getTenantId();
    return tid ? `bako_last_order_${tid}` : 'bako_last_order_guest';
};

export const getTariffKey = () => {
    const tid = getTenantId();
    return tid ? `bako_courier_tariff_${tid}` : 'bako_courier_tariff_guest';
};

export const getPaymentMethodKey = () => {
    const tid = getTenantId();
    return tid ? `bako_payment_method_${tid}` : 'bako_payment_method_guest';
};