// src/utils/notificationStore.js
import { getUnreadNotificationCount } from '../services/api';

// ============================================================
//  🎯 Store مرکزی تعداد اعلان‌های خوانده‌نشده
//  - همه کامپوننت‌ها از یه منبع واحد subscribe می‌کنن
//  - چندین مکانیزم refresh موازی کار می‌کنن
// ============================================================

let count = 0;
const listeners = new Set();
let initialized = false;

/* ============================================================
   اطلاع‌دادن به همه listenerها
   ============================================================ */
const notify = () => {
    listeners.forEach((cb) => {
        try {
            cb(count);
        } catch (e) {
            console.error('❌ خطا در listener اعلان:', e);
        }
    });
};

/* ============================================================
   Subscribe — هر کامپوننتی که تعداد رو می‌خواد
   ============================================================ */
export const subscribeToNotificationCount = (cb) => {
    listeners.add(cb);
    cb(count); // مقدار فعلی رو فوراً بده
    return () => {
        listeners.delete(cb);
    };
};

/* ============================================================
   خواندن مقدار فعلی (بدون subscribe)
   ============================================================ */
export const getNotificationCountValue = () => count;

/* ============================================================
   🎯 Refresh — تعداد رو از سرور می‌گیره و همه رو خبر می‌کنه
   ============================================================ */
export const refreshNotificationCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        count = 0;
        notify();
        return 0;
    }

    try {
        const res = await getUnreadNotificationCount();
        const newCount = res.data?.count || 0;

        if (newCount !== count) {
            console.log(`🔔 [notificationStore] تعداد اعلان: ${count} → ${newCount}`);
            count = newCount;
            notify();
        }

        return newCount;
    } catch (err) {
        console.error('❌ [notificationStore] خطا در دریافت تعداد اعلان‌ها:', err);
        return count;
    }
};

/* ============================================================
   🎯 مقداردهی اولیه — فقط یک‌بار اجرا می‌شه
   چندین مکانیزم refresh رو فعال می‌کنه
   ============================================================ */
export const initializeNotificationStore = () => {
    if (initialized) return;
    initialized = true;

    console.log('🚀 [notificationStore] مقداردهی اولیه');

    // ۱) بار اول
    refreshNotificationCount();

    if (typeof window === 'undefined') return;

    // ۲) گوش دادن به event سراسری
    window.addEventListener('notificationsUpdated', () => {
        console.log('📢 [notificationStore] رویداد notificationsUpdated دریافت شد');
        refreshNotificationCount();
    });

    // ۳) focus روی تب → refresh
    window.addEventListener('focus', () => {
        refreshNotificationCount();
    });

    // ۴) visibilitychange → refresh
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshNotificationCount();
        }
    });

    // ۵) polling پشتیبان — هر ۳۰ ثانیه
    setInterval(() => {
        const token = localStorage.getItem('token');
        if (token && !document.hidden) {
            refreshNotificationCount();
        }
    }, 30000);
};