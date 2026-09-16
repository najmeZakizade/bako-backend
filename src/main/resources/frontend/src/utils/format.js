// src/utils/format.js

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export function toPersianNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * تبدیل عدد فارسی به انگلیسی
 */
export function toEnglishNumber(value) {
    if (!value) return '';
    return String(value).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

/**
 * فرمت قیمت با جداکننده هزار و اعداد فارسی
 */
export function formatPrice(price) {
    if (price === null || price === undefined || price === '') return '۰';
    const num = Number(price);
    if (isNaN(num)) return toPersianNumber(price);
    return toPersianNumber(num.toLocaleString('en-US'));
}

/**
 * فرمت قیمت + واحد «ریال»
 */
export function formatPriceWithUnit(price) {
    return `${formatPrice(price)} ریال`;
}