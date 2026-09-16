// src/components/common/PlateInput.jsx
import { useState, useEffect } from 'react';
import { toPersianNumber, toEnglishNumber } from '../../utils/format';

const PLATE_LETTERS = [
    'الف', 'ب', 'پ', 'ت', 'ث', 'ج', 'د', 'ز',
    'ط', 'ع', 'ف', 'ق', 'ک', 'گ', 'ل', 'م',
    'ن', 'و', 'ه', 'ی'
];

// پلاک ذخیره‌شده رو به بخش‌ها می‌شکنه تا در حالت ویرایش پر بشه
function parsePlate(plateStr, vehicleType) {
    if (vehicleType === 'CAR') {
        if (plateStr) {
            const match = plateStr.match(/^(\d{2})([ا-ی]+)(\d{3})-(\d{2})$/);
            if (match) return { p1: match[1], letter: match[2], p2: match[3], province: match[4] };
        }
        return { p1: '', letter: '', p2: '', province: '' };
    }
    // موتورسیکلت
    if (plateStr) {
        const match = plateStr.match(/^(\d{5})-(\d{3})$/);
        if (match) return { p1: match[1], province: match[2] };
    }
    return { p1: '', province: '' };
}

function PlateInput({ vehicleType, value, onChange }) {
    const [parts, setParts] = useState(() => parsePlate(value, vehicleType));

    // اگر نوع وسیله عوض شد، بخش‌ها رو دوباره بساز
    useEffect(() => {
        setParts(parsePlate(value, vehicleType));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleType]);

    const emitChange = (next) => {
        setParts(next);
        if (vehicleType === 'CAR') {
            const { p1, letter, p2, province } = next;
            if (p1.length === 2 && letter && p2.length === 3 && province.length === 2) {
                onChange(`${p1}${letter}${p2}-${province}`);
            } else {
                onChange('');
            }
        } else {
            const { p1, province } = next;
            if (p1.length === 5 && province.length === 3) {
                onChange(`${p1}-${province}`);
            } else {
                onChange('');
            }
        }
    };

    const handleDigits = (field, maxLen) => (e) => {
        const digits = toEnglishNumber(e.target.value).replace(/\D/g, '').slice(0, maxLen);
        emitChange({ ...parts, [field]: digits });
    };

    if (vehicleType === 'BICYCLE') {
        return null;
    }

    if (vehicleType === 'CAR') {
        return (
            <div className="plate-input" style={{ display: 'flex', alignItems: 'center', gap: '4px', direction: 'ltr' }}>
                <input
                    type="text"
                    value={toPersianNumber(parts.province)}
                    onChange={handleDigits('province', 2)}
                    placeholder="۶۷"
                    inputMode="numeric"
                    style={{ width: '42px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '12px' }}>ایران</span>
                <input
                    type="text"
                    value={toPersianNumber(parts.p2)}
                    onChange={handleDigits('p2', 3)}
                    placeholder="۳۴۵"
                    inputMode="numeric"
                    style={{ width: '48px', textAlign: 'center' }}
                />
                <select
                    value={parts.letter}
                    onChange={(e) => emitChange({ ...parts, letter: e.target.value })}
                    style={{ width: '60px' }}
                >
                    <option value="">حرف</option>
                    {PLATE_LETTERS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={toPersianNumber(parts.p1)}
                    onChange={handleDigits('p1', 2)}
                    placeholder="۱۲"
                    inputMode="numeric"
                    style={{ width: '38px', textAlign: 'center' }}
                />
            </div>
        );
    }

    // موتورسیکلت
    return (
        <div className="plate-input" style={{ display: 'flex', alignItems: 'center', gap: '4px', direction: 'ltr' }}>
            <input
                type="text"
                value={toPersianNumber(parts.province)}
                onChange={handleDigits('province', 3)}
                placeholder="۶۷۸"
                inputMode="numeric"
                style={{ width: '48px', textAlign: 'center' }}
            />
            <span>-</span>
            <input
                type="text"
                value={toPersianNumber(parts.p1)}
                onChange={handleDigits('p1', 5)}
                placeholder="۱۲۳۴۵"
                inputMode="numeric"
                style={{ width: '64px', textAlign: 'center' }}
            />
        </div>
    );
}

export default PlateInput;