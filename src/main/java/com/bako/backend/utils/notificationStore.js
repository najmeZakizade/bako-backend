// src/utils/notificationStore.js
import { getUnreadNotificationCount } from '../services/api';

// ============================================================
//  🎯 Store مرکزی تعداد اعلان‌های خوانده‌نشده
// ============================================================

        let count = 0;
        const listeners = new Set();
        let initialized = false;

        const notify = () => {
        listeners.forEach((cb) => {
        try {
        cb(count);
        } catch (e) {
        console.error('❌ خطا در listener اعلان:', e);
        }
        });
        };

        export const subscribeToNotificationCount = (cb) => {
        listeners.add(cb);
        cb(count);
        return () => listeners.delete(cb);
        };

        export const getNotificationCountValue = () => count;

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
        count = newCount;
        notify();
        }
        return newCount;
        } catch (err) {
        console.error('❌ خطا در دریافت تعداد اعلان‌ها:', err);
        return count;
        }
        };

        export const initializeNotificationStore = () => {
        if (initialized) return;
        initialized = true;

        refreshNotificationCount();

        if (typeof window === 'undefined') return;

        window.addEventListener('notificationsUpdated', () => {
        refreshNotificationCount();
        });

        window.addEventListener('focus', () => {
        refreshNotificationCount();
        });

        document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
        refreshNotificationCount();
        }
        });

        // polling هر ۳۰ ثانیه
        setInterval(() => {
        const token = localStorage.getItem('token');
        if (token && !document.hidden) {
        refreshNotificationCount();
        }
        }, 30000);
        };