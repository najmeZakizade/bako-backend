// src/utils/toast.js

/**
 * نمایش پیام گرافیکی (Toast)
 * @param {string} message - متن پیام
 * @param {string} type - نوع پیام: 'success' یا 'error'
 * @param {number} duration - مدت زمان نمایش (میلی‌ثانیه)
 */
export const showToast = (message, type = 'success', duration = 3000) => {
    // حذف toast قبلی اگر وجود داشته باشد
    const existingToast = document.querySelector('.toast-center');
    if (existingToast) {
        existingToast.remove();
    }

    // انتخاب آیکون مناسب
    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };
    const icon = iconMap[type] || '📢';

    // ساخت المان toast
    const toast = document.createElement('div');
    toast.className = `toast-center ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-text">${message}</span>
        <button class="toast-close" aria-label="بستن">✕</button>
    `;

    // اضافه کردن به body
    document.body.appendChild(toast);

    // دکمه بستن
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });

    // حذف خودکار پس از مدت زمان مشخص
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
};