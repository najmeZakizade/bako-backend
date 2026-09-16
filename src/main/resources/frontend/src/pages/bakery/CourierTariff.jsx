// src/pages/bakery/CourierTariff.jsx
import { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import {
    getCourierTariff,
    updateCourierTariff,
} from '../../services/api';
import { toPersianNumber, formatPrice, toEnglishNumber } from '../../utils/format';

function CourierTariff() {
    const [form, setForm] = useState({
        baseFee: 15000,
        perKmRate: 5000,
        tariffActive: true,
        freeDeliveryEnabled: false,
        freeDeliveryThreshold: 500000,
        deliveryCommissionType: 'PERCENTAGE',
        deliveryCommissionValue: 20,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testDistance, setTestDistance] = useState(5);
    const [error, setError] = useState('');

    // ===== بارگذاری تعرفه =====
    useEffect(() => {
        fetchTariff();
    }, []);

    const fetchTariff = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getCourierTariff();
            const data = res.data || {};
            setForm({
                baseFee: data.baseFee ?? 15000,
                perKmRate: data.perKmRate ?? 5000,
                tariffActive: data.tariffActive ?? true,
                freeDeliveryEnabled: data.freeDeliveryEnabled ?? false,
                freeDeliveryThreshold: data.freeDeliveryThreshold ?? 500000,
                deliveryCommissionType: data.deliveryCommissionType ?? 'PERCENTAGE',
                deliveryCommissionValue: data.deliveryCommissionValue ?? 20,
            });
        } catch (err) {
            console.error('خطا در دریافت تعرفه:', err);
            const msg = err.response?.data?.message || 'خطا در دریافت تعرفه';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setForm(prev => ({ ...prev, [name]: checked }));
            return;
        }
        const numericFields = [
            'baseFee', 'perKmRate',
            'freeDeliveryThreshold', 'deliveryCommissionValue'
        ];
        const normalized = numericFields.includes(name) ? toEnglishNumber(value) : value;
        setForm(prev => ({ ...prev, [name]: normalized }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const baseFee = Number(form.baseFee) || 0;
        const perKmRate = Number(form.perKmRate) || 0;
        const freeThreshold = Number(form.freeDeliveryThreshold) || 0;
        const commissionValue = Number(form.deliveryCommissionValue) || 0;

        if (form.deliveryCommissionType === 'PERCENTAGE' && commissionValue > 100) {
            showToast('❌ درصد سهم نانوایی نمی‌تواند بیشتر از ۱۰۰ باشد.', 'error');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                baseFee,
                perKmRate,
                tariffActive: form.tariffActive,
                freeDeliveryEnabled: form.freeDeliveryEnabled,
                freeDeliveryThreshold: freeThreshold,
                deliveryCommissionType: form.deliveryCommissionType,
                deliveryCommissionValue: commissionValue,
            };

            await updateCourierTariff(payload);
            showToast('✅ تعرفه پیک با موفقیت ذخیره شد', 'success');
            await fetchTariff();
        } catch (err) {
            console.error('خطا در ذخیره تعرفه:', err);
            const msg = err.response?.data?.message || 'خطا در ذخیره تعرفه';
            setError(msg);
            showToast(`❌ ${msg}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('آیا از بازنشانی مقادیر پیش‌فرض مطمئن هستید؟')) {
            setForm({
                baseFee: 15000,
                perKmRate: 5000,
                tariffActive: true,
                freeDeliveryEnabled: false,
                freeDeliveryThreshold: 500000,
                deliveryCommissionType: 'PERCENTAGE',
                deliveryCommissionValue: 20,
            });
            showToast('مقادیر به حالت پیش‌فرض بازگشت (ذخیره نشده)', 'success');
        }
    };

    // ===== محاسبه هزینه آزمایشی =====
    const calcDeliveryCost = (distance) => {
        const d = Number(distance) || 0;
        const base = Number(form.baseFee) || 0;
        const perKm = Number(form.perKmRate) || 0;
        return base + perKm * d;
    };

    const estimatedCost = calcDeliveryCost(testDistance);

    const calcCommission = (totalPrice) => {
        const type = form.deliveryCommissionType;
        const value = Number(form.deliveryCommissionValue) || 0;
        if (type === 'PERCENTAGE') {
            return Math.round(totalPrice * value / 100);
        }
        return Math.min(value, totalPrice);
    };

    const estimatedCommission = calcCommission(estimatedCost);
    const estimatedPayout = estimatedCost - estimatedCommission;

    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری تعرفه...</p>
            </div>
        );
    }

    return (
        <div className="courier-tariff-page">

            {error && <div className="error-box">❌ {error}</div>}

            {/* ===== فرم اصلی ===== */}
            <div className="product-form" style={{ maxWidth: '820px' }}>
                <h3>🚚 تنظیمات تعرفه پیک</h3>

                <form onSubmit={handleSave}>

                    {/* ===== ردیف واحد: کرایه پایه + نرخ کیلومتر + ارسال رایگان ===== */}
                    <div
                        className="form-row"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'flex-end',
                            gap: '10px',
                        }}
                    >
                        {/* کرایه پایه */}
                        <div className="form-group" style={{ flex: '1 1 150px', minWidth: '130px' }}>
                            <label>کرایه پایه (ریال) *</label>
                            <input
                                type="text"
                                name="baseFee"
                                value={form.baseFee}
                                onChange={handleChange}
                                placeholder="مثال: ۱۵۰۰۰"
                                inputMode="numeric"
                            />
                        </div>

                        {/* نرخ هر کیلومتر */}
                        <div className="form-group" style={{ flex: '1 1 150px', minWidth: '130px' }}>
                            <label>نرخ هر کیلومتر (ریال) *</label>
                            <input
                                type="text"
                                name="perKmRate"
                                value={form.perKmRate}
                                onChange={handleChange}
                                placeholder="مثال: ۵۰۰۰"
                                inputMode="numeric"
                            />
                        </div>

                        {/* 🎁 ارسال رایگان داشته باشم + مبلغ */}
                        <div
                            className="form-group"
                            style={{
                                flex: '1.3 1 260px',
                                minWidth: '240px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                            }}
                        >
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: 'var(--text-dark)',
                                    height: '17px',
                                    lineHeight: '17px',
                                    margin: 0,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    name="freeDeliveryEnabled"
                                    checked={form.freeDeliveryEnabled}
                                    onChange={handleChange}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        cursor: 'pointer',
                                        accentColor: 'var(--green)',
                                        margin: 0,
                                        flexShrink: 0,
                                    }}
                                />
                                🎁 ارسال رایگان داشته باشم
                            </label>

                            {form.freeDeliveryEnabled ? (
                                <input
                                    type="text"
                                    name="freeDeliveryThreshold"
                                    value={form.freeDeliveryThreshold}
                                    onChange={handleChange}
                                    placeholder="سفارش بالای این مبلغ (ریال)"
                                    inputMode="numeric"
                                />
                            ) : (
                                <div
                                    style={{
                                        height: '34px',
                                        background: '#f5f0e8',
                                        border: '1.5px dashed #e8e0d8',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10.5px',
                                        color: '#a89a8a',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    برای فعال‌سازی، تیک بزنید
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ===== بخش سهم نانوایی ===== */}
                    <div style={{
                        marginTop: '16px',
                        padding: '12px 14px',
                        background: '#fdf6ec',
                        borderRadius: 'var(--radius)',
                        border: '1px dashed var(--gold-soft)',
                    }}>
                        <h4 style={{
                            margin: '0 0 10px 0',
                            fontSize: '12.5px',
                            color: 'var(--text-dark)',
                            fontWeight: '700',
                        }}>
                            💰 سهم نانوایی از هزینه ارسال
                        </h4>

                        <div className="form-row" style={{ flexWrap: 'wrap' }}>
                            <div className="form-group">
                                <label>نوع سهم</label>
                                <select
                                    name="deliveryCommissionType"
                                    value={form.deliveryCommissionType}
                                    onChange={handleChange}
                                >
                                    <option value="PERCENTAGE">درصدی (%)</option>
                                    <option value="FIXED">مبلغ ثابت (ریال)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>
                                    مقدار {form.deliveryCommissionType === 'PERCENTAGE' ? '(%)' : '(ریال)'}
                                </label>
                                <input
                                    type="text"
                                    name="deliveryCommissionValue"
                                    value={form.deliveryCommissionValue}
                                    onChange={handleChange}
                                    placeholder={form.deliveryCommissionType === 'PERCENTAGE' ? 'مثال: ۲۰' : 'مثال: ۵۰۰۰'}
                                    inputMode="numeric"
                                />
                            </div>
                        </div>

                        <p style={{
                            fontSize: '11px',
                            color: 'var(--primary-light)',
                            margin: '8px 0 0 0',
                            lineHeight: '1.7',
                        }}>
                            {form.deliveryCommissionType === 'PERCENTAGE'
                                ? `نانوایی ${toPersianNumber(form.deliveryCommissionValue)}٪ از هر هزینه ارسال را دریافت می‌کند.`
                                : `نانوایی مبلغ ${formatPrice(form.deliveryCommissionValue)} ریال از هر هزینه ارسال را دریافت می‌کند.`}
                        </p>
                    </div>

                    {/* ===== چک‌باکس فعال + دکمه‌ها ===== */}
                    <div className="form-row" style={{ marginTop: '14px', alignItems: 'center' }}>
                        <label className="tariff-checkbox" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'var(--text-dark)',
                        }}>
                            <input
                                type="checkbox"
                                name="tariffActive"
                                checked={form.tariffActive}
                                onChange={handleChange}
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer',
                                    accentColor: 'var(--green)',
                                }}
                            />
                            تعرفه پیک فعال باشد
                        </label>

                        <div className="form-actions" style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn-submit-product" disabled={saving}>
                                {saving ? '⏳ در حال ذخیره...' : '💾 ذخیره تعرفه'}
                            </button>
                            <button type="button" className="btn-cancel-product" onClick={handleReset}>
                                🔄 بازنشانی
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ===== محاسبه‌گر آزمایشی ===== */}
            <div style={{
                maxWidth: '820px',
                marginTop: '20px',
                background: 'linear-gradient(135deg, #fbefd9 0%, #f6e3c2 100%)',
                padding: '18px 22px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--gold-soft)',
            }}>
                <h3 style={{
                    margin: '0 0 14px 0',
                    fontSize: '14px',
                    color: 'var(--text-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    🧮 محاسبه‌گر آزمایشی
                </h3>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: '1', minWidth: '140px', margin: 0 }}>
                        <label style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'var(--text-dark)',
                            marginBottom: '4px',
                        }}>
                            مسافت (کیلومتر)
                        </label>
                        <input
                            type="text"
                            value={testDistance}
                            onChange={(e) => setTestDistance(toEnglishNumber(e.target.value))}
                            inputMode="numeric"
                            style={{
                                width: '100%',
                                padding: '7px 11px',
                                border: '1.5px solid var(--gold-soft)',
                                borderRadius: '8px',
                                fontSize: '12.5px',
                                fontFamily: 'inherit',
                                outline: 'none',
                                background: 'white',
                            }}
                        />
                    </div>

                    <div style={{
                        flex: '2',
                        minWidth: '240px',
                        background: 'white',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        border: '1.5px solid var(--gold-soft)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--primary-light)', marginBottom: '6px' }}>
                            هزینه ارسال برای {toPersianNumber(testDistance)} کیلومتر:
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: '800',
                            color: 'var(--gold-dark)',
                            marginBottom: '8px',
                        }}>
                            {formatPrice(estimatedCost)}{' '}
                            <span style={{ fontSize: '13px', color: 'var(--text-dark)' }}>ریال</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            paddingTop: '8px',
                            borderTop: '1px dashed #e8dccd',
                            fontSize: '11px',
                        }}>
                            <div>
                                <div style={{ color: 'var(--primary-light)' }}>سهم نانوایی</div>
                                <strong style={{ color: 'var(--green-dark)' }}>
                                    {formatPrice(estimatedCommission)}
                                </strong>
                            </div>
                            <div>
                                <div style={{ color: 'var(--primary-light)' }}>سهم پیک</div>
                                <strong style={{ color: 'var(--gold-dark)' }}>
                                    {formatPrice(estimatedPayout)}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    marginTop: '12px',
                    fontSize: '11px',
                    color: 'var(--primary-light)',
                    lineHeight: '1.7',
                }}>
                    📌 فرمول: کرایه پایه ({formatPrice(form.baseFee)} ریال) + (مسافت × نرخ هر کیلومتر {formatPrice(form.perKmRate)} ریال)
                </div>
            </div>

            {/* ===== راهنما ===== */}
            <div style={{
                maxWidth: '820px',
                marginTop: '16px',
                background: 'var(--card-bg)',
                padding: '14px 18px',
                borderRadius: 'var(--radius)',
                border: '1px solid #eee4db',
            }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--text-dark)' }}>
                    💡 راهنما
                </h4>
                <ul style={{
                    margin: 0,
                    paddingRight: '18px',
                    fontSize: '11.5px',
                    color: 'var(--primary-light)',
                    lineHeight: '1.9',
                }}>
                    <li><strong>کرایه پایه:</strong> مبلغ ثابتی که به همه سفارش‌ها اضافه می‌شود.</li>
                    <li><strong>نرخ هر کیلومتر:</strong> مبلغی که به ازای هر کیلومتر مسافت محاسبه می‌شود.</li>
                    <li><strong>ارسال رایگان:</strong> اگه فعال باشه و مبلغ سفارش از حد مشخص‌شده بیشتر بشه، هزینه ارسال صفر میشه.</li>
                    <li><strong>سهم نانوایی:</strong> بخشی از هزینه ارسال که به نانوایی می‌رسه — می‌تونه درصدی یا مبلغ ثابت باشه.</li>
                </ul>
            </div>
        </div>
    );
}

export default CourierTariff;