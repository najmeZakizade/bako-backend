// src/utils/cartStore.js
import { getCartCount } from '../services/api';

// ============================================================
//  🎯 Store مرکزی تعداد سبد خرید
//  - همه کامپوننت‌ها به یه منبع واحد subscribe می‌کنن
//  - چندین مکانیزم refresh به‌صورت موازی کار می‌کنن
// ============================================================

let count = 0;
const listeners = new Set();
let initialized = false;

/* ============================================================
   اطلاع‌دادن به همه‌ی listenerها
   ============================================================ */
const notify = () => {
    listeners.forEach((cb) => {
        try {
            cb(count);
        } catch (e) {
            console.error('❌ خطا در listener سبد:', e);
        }
    });
};

/* ============================================================
   Subscribe — هر کامپوننتی که می‌خواد تعداد رو بدونه
   ============================================================ */
export const subscribeToCartCount = (cb) => {
    listeners.add(cb);
    cb(count); // مقدار فعلی رو فوراً بده
    return () => {
        listeners.delete(cb);
    };
};

/* ============================================================
   خواندن مقدار فعلی (بدون subscribe)
   ============================================================ */
export const getCartCountValue = () => count;

/* ============================================================
   🎯 Refresh — تعداد رو از سرور می‌گیره و همه رو خبر می‌کنه
   ============================================================ */
export const refreshCartCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        count = 0;
        notify();
        return 0;
    }

    try {
        const res = await getCartCount();
        const newCount = res.data?.count || 0;

        if (newCount !== count) {
            console.log(`🔄 [cartStore] تعداد سبد: ${count} → ${newCount}`);
            count = newCount;
            notify();
        }

        return newCount;
    } catch (err) {
        console.error('❌ [cartStore] خطا در دریافت تعداد سبد:', err);
        return count;
    }
};

/* ============================================================
   🎯 مقداردهی اولیه — فقط یک‌بار اجرا می‌شه
   چندین مکانیزم refresh رو فعال می‌کنه
   ============================================================ */
export const initializeCartStore = () => {
    if (initialized) return;
    initialized = true;

    console.log('🚀 [cartStore] مقداردهی اولیه');

    // ۱) بار اول
    refreshCartCount();

    if (typeof window === 'undefined') return;

    // ۲) گوش دادن به event سراسری `cartUpdated`
    window.addEventListener('cartUpdated', () => {
        console.log('📢 [cartStore] رویداد cartUpdated دریافت شد');
        refreshCartCount();
    });

    // ۳) focus روی تب → refresh
    window.addEventListener('focus', () => {
        refreshCartCount();
    });

    // ۴) visibilitychange (برگشت به تب) → refresh
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshCartCount();
        }
    });

    // ۵) 🆕 polling پشتیبان — هر ۳۰ ثانیه
    setInterval(() => {
        const token = localStorage.getItem('token');
        if (token && !document.hidden) {
            refreshCartCount();
        }
    }, 30000);
};