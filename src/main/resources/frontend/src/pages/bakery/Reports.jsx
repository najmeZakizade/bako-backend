// src/pages/bakery/Reports.jsx
import { useState, useEffect, useRef } from 'react';
import { getOrders, getProducts } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import moment from 'moment-jalaali';

moment.loadPersian({ dialect: 'persian-modern' });

/* ============================================================
   🎯 استخراج نام و قیمت از item — سازگار با هر دو ساختار
   ============================================================ */
const getItemName = (item) => {
    return (
        item?.productName ||
        item?.name ||
        item?.product?.name ||
        ''
    );
};

const getItemPrice = (item) => {
    const price =
        item?.productPrice ??
        item?.price ??
        item?.unitPrice ??
        item?.product?.price ??
        0;
    return Number(price) || 0;
};

const getItemQty = (item) => {
    const qty = item?.quantity ?? item?.qty ?? 0;
    return Number(qty) || 0;
};

function Reports() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');
    const [productsList, setProductsList] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [productStats, setProductStats] = useState(null);
    const [showCalendar, setShowCalendar] = useState(null);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(moment());
    const calendarRef = useRef(null);
    const productDropdownRef = useRef(null);

    /* ============================================================
       دریافت لیست محصولات
       ============================================================ */
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await getProducts();
                setProductsList(res.data || []);
            } catch (err) {
                console.error('خطا در دریافت لیست محصولات:', err);
                showToast('خطا در دریافت لیست محصولات', 'error');
            }
        };
        fetchProducts();
    }, []);

    /* ============================================================
       دریافت و محاسبه گزارش
       ============================================================ */
    const fetchReport = async () => {
        setLoading(true);
        setError('');
        setProductStats(null);

        try {
            const ordersRes = await getOrders();
            let orders = ordersRes.data || [];

            /* ===== فیلتر بازه زمانی ===== */
            if (startDate && endDate) {
                const startMoment = moment(startDate, 'jYYYY/jMM/jDD');
                const endMoment = moment(endDate, 'jYYYY/jMM/jDD');

                if (startMoment.isValid() && endMoment.isValid()) {
                    const startGreg = startMoment.format('YYYY-MM-DD');
                    const endGreg = endMoment.format('YYYY-MM-DD');

                    orders = orders.filter((order) => {
                        if (!order.orderDate) return false;
                        const orderDate = moment(order.orderDate).format(
                            'YYYY-MM-DD'
                        );
                        return orderDate >= startGreg && orderDate <= endGreg;
                    });
                }
            }

            /* ===== فیلتر محصول انتخاب‌شده ===== */
            let filteredOrders = orders;
            if (selectedProductId) {
                filteredOrders = orders.filter((order) => {
                    if (!order.items || !Array.isArray(order.items))
                        return false;
                    return order.items.some(
                        (item) =>
                            String(item.productId) ===
                            String(selectedProductId)
                    );
                });
            }

            const totalOrders = filteredOrders.length;

            /* ============================================================
               🎯 درآمد کل = جمع order.totalPrice (منبع واحد با Dashboard)
               ============================================================ */
            let totalRevenue = 0;
            filteredOrders.forEach((order) => {
                totalRevenue += Number(order.totalPrice) || 0;
            });

            const averageOrder =
                totalOrders > 0
                    ? Math.round(totalRevenue / totalOrders)
                    : 0;

            /* ============================================================
               محاسبه فروش هر محصول (فقط برای آمار محصول انتخاب‌شده)
               ============================================================ */
            const productSales = {};

            filteredOrders.forEach((order) => {
                if (!order.items || !Array.isArray(order.items)) return;

                order.items.forEach((item) => {
                    const productId = item.productId;
                    if (!productId) return;

                    if (!productSales[productId]) {
                        let displayName = getItemName(item);

                        if (
                            (!displayName || displayName.trim() === '') &&
                            Array.isArray(productsList)
                        ) {
                            const found = productsList.find(
                                (p) =>
                                    String(p._id || p.id) ===
                                    String(productId)
                            );
                            displayName = found?.name || '';
                        }

                        productSales[productId] = {
                            quantity: 0,
                            revenue: 0,
                            name: displayName.trim() || 'نامشخص',
                        };
                    }

                    const price = getItemPrice(item);
                    const qty = getItemQty(item);

                    productSales[productId].quantity += qty;
                    productSales[productId].revenue += price * qty;
                });
            });

            /* ===== آمار محصول انتخاب‌شده ===== */
            if (selectedProductId) {
                const selectedProduct = productsList.find(
                    (p) =>
                        String(p._id || p.id) === String(selectedProductId)
                );

                let totalQuantity = 0;
                let totalRevenueForProduct = 0;

                filteredOrders.forEach((order) => {
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach((item) => {
                            if (
                                String(item.productId) ===
                                String(selectedProductId)
                            ) {
                                totalQuantity += getItemQty(item);
                                totalRevenueForProduct +=
                                    getItemPrice(item) * getItemQty(item);
                            }
                        });
                    }
                });

                setProductStats({
                    name: selectedProduct?.name || 'نامشخص',
                    quantity: totalQuantity,
                    revenue: totalRevenueForProduct,
                });
            }

            setReport({
                totalOrders,
                totalRevenue,
                averageOrder,
                orders: filteredOrders,
                productSales: productSales,
            });
        } catch (err) {
            console.error('خطا در دریافت گزارش:', err);
            setError('خطا در دریافت اطلاعات گزارش');
            showToast('خطا در دریافت گزارش', 'error');
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    /* ============================================================
       اجرای اولیه + واکنش به فیلترها
       ============================================================ */
    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, selectedProductId]);

    /* ============================================================
       کلیک بیرون — بستن تقویم و dropdown
       ============================================================ */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                calendarRef.current &&
                !calendarRef.current.contains(e.target)
            ) {
                setShowCalendar(null);
            }
            if (
                productDropdownRef.current &&
                !productDropdownRef.current.contains(e.target)
            ) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ============================================================
       توابع کمکی نمایش
       ============================================================ */
    const getStatusText = (status) => {
        const map = {
            PENDING: 'در انتظار',
            CONFIRMED: 'تأیید شده',
            PREPARING: 'در حال آماده‌سازی',
            READY: 'آماده تحویل',
            DELIVERED: 'تحویل شد',
            CANCELLED: 'لغو شد',
        };
        return map[status] || status;
    };

    const getStatusBadge = (status) => {
        const map = {
            PENDING: 'badge-honey',
            CONFIRMED: 'badge-blue',
            PREPARING: 'badge-orange',
            READY: 'badge-purple',
            DELIVERED: 'badge-herb',
            CANCELLED: 'badge-red',
        };
        return map[status] || 'badge-gray';
    };

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSelectedProductId('');
        setProductStats(null);
        setCurrentMonth(moment());
        setTimeout(() => fetchReport(), 100);
    };

    /* ============================================================
       تقویم شمسی
       ============================================================ */
    const getJalaliMonthDays = (month) => {
        const start = moment(month).startOf('jMonth');
        const end = moment(month).endOf('jMonth');
        const days = [];
        let current = start.clone();
        while (current <= end) {
            days.push(current.clone());
            current.add(1, 'day');
        }
        return days;
    };

    const renderCalendar = (type) => {
        const days = getJalaliMonthDays(currentMonth);
        const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
        const firstDayOffset = moment(currentMonth)
            .startOf('jMonth')
            .weekday();

        return (
            <div
                ref={calendarRef}
                style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    padding: '12px',
                    zIndex: 1000,
                    minWidth: '260px',
                    border: '1px solid #eee',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        padding: '0 4px',
                    }}
                >
                    <button
                        onClick={() =>
                            setCurrentMonth(
                                currentMonth.clone().subtract(1, 'jMonth')
                            )
                        }
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                        }}
                    >
                        ›
                    </button>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        {currentMonth.format('jMMMM jYYYY')}
                    </span>
                    <button
                        onClick={() =>
                            setCurrentMonth(
                                currentMonth.clone().add(1, 'jMonth')
                            )
                        }
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                        }}
                    >
                        ‹
                    </button>
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        textAlign: 'center',
                        fontSize: '12px',
                    }}
                >
                    {weekDays.map((d, i) => (
                        <div
                            key={i}
                            style={{
                                fontWeight: 'bold',
                                color: '#6b3f2b',
                                padding: '4px',
                            }}
                        >
                            {d}
                        </div>
                    ))}
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {days.map((day) => {
                        const isToday = day.isSame(moment(), 'day');
                        const dayStr = day.format('jYYYY/jMM/jDD');
                        const isSelected =
                            (type === 'start' && dayStr === startDate) ||
                            (type === 'end' && dayStr === endDate);
                        return (
                            <div
                                key={dayStr}
                                onClick={() => {
                                    const formatted =
                                        day.format('jYYYY/jMM/jDD');
                                    if (type === 'start') {
                                        setStartDate(formatted);
                                    } else {
                                        setEndDate(formatted);
                                    }
                                    setShowCalendar(null);
                                    setCurrentMonth(day);
                                }}
                                style={{
                                    padding: '6px 2px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: isSelected
                                        ? 'var(--gold-soft)'
                                        : isToday
                                            ? '#f0ebe7'
                                            : 'transparent',
                                    fontWeight: isSelected
                                        ? 'bold'
                                        : isToday
                                            ? '600'
                                            : 'normal',
                                    color: isSelected
                                        ? 'white'
                                        : '#2c1810',
                                    transition: '0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected)
                                        e.target.style.background =
                                            '#f5ede6';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected)
                                        e.target.style.background = isToday
                                            ? '#f0ebe7'
                                            : 'transparent';
                                }}
                            >
                                {toPersianNumber(day.format('jD'))}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    /* ============================================================
       Dropdown سفارشی محصول
       ============================================================ */
    const renderProductDropdown = () => {
        const selectedProduct = productsList.find(
            (p) => (p._id || p.id) === selectedProductId
        );
        const displayText = selectedProduct
            ? selectedProduct.name
            : 'همه محصولات';

        return (
            <div
                ref={productDropdownRef}
                style={{ position: 'relative', minWidth: '220px' }}
            >
                <button
                    type="button"
                    onClick={() => setShowProductDropdown((prev) => !prev)}
                    style={{
                        width: '100%',
                        padding: '6px 36px 6px 12px',
                        border: '2px solid var(--gray)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'var(--cream-light)',
                        cursor: 'pointer',
                        textAlign: 'right',
                        direction: 'rtl',
                        color: 'var(--text-dark)',
                        height: '34px',
                        lineHeight: '1.2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        position: 'relative',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                    title={displayText}
                >
                    <span
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            textAlign: 'right',
                            paddingRight: '4px',
                        }}
                    >
                        {displayText}
                    </span>
                    <span
                        style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            color: 'var(--primary-light)',
                            transition: 'transform 0.2s ease',
                            pointerEvents: 'none',
                        }}
                    >
                        ▼
                    </span>
                </button>

                {showProductDropdown && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            left: 0,
                            marginTop: '4px',
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                            border: '1px solid #eee',
                            zIndex: 1000,
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '4px',
                        }}
                    >
                        <div
                            onClick={() => {
                                setSelectedProductId('');
                                setShowProductDropdown(false);
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                fontSize: '13px',
                                background:
                                    selectedProductId === ''
                                        ? 'var(--gold-soft)'
                                        : 'transparent',
                                color:
                                    selectedProductId === ''
                                        ? 'white'
                                        : 'var(--text-dark)',
                                fontWeight:
                                    selectedProductId === '' ? '700' : '500',
                                direction: 'rtl',
                                textAlign: 'right',
                                transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (selectedProductId !== '')
                                    e.target.style.background = '#f5ede6';
                            }}
                            onMouseLeave={(e) => {
                                if (selectedProductId !== '')
                                    e.target.style.background = 'transparent';
                            }}
                        >
                            همه محصولات
                        </div>

                        {productsList.map((product) => {
                            const id = product._id || product.id;
                            const isSelected =
                                String(selectedProductId) === String(id);
                            return (
                                <div
                                    key={id}
                                    onClick={() => {
                                        setSelectedProductId(id);
                                        setShowProductDropdown(false);
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        background: isSelected
                                            ? 'var(--gold-soft)'
                                            : 'transparent',
                                        color: isSelected
                                            ? 'white'
                                            : 'var(--text-dark)',
                                        fontWeight: isSelected
                                            ? '700'
                                            : '500',
                                        direction: 'rtl',
                                        textAlign: 'right',
                                        transition:
                                            'background 0.15s ease',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={product.name}
                                    onMouseEnter={(e) => {
                                        if (!isSelected)
                                            e.target.style.background =
                                                '#f5ede6';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected)
                                            e.target.style.background =
                                                'transparent';
                                    }}
                                >
                                    {product.name}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    /* ============================================================
       رندر — بارگذاری
       ============================================================ */
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری گزارش...</p>
            </div>
        );
    }

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="reports-page">
            {error && (
                <div
                    className="error-box"
                    style={{
                        background: '#f8d7da',
                        color: '#721c24',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        borderRight: '4px solid #dc3545',
                    }}
                >
                    ❌ {error}
                </div>
            )}

            {/* ===== نوار فیلتر ===== */}
            <div
                className="filter-bar"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'white',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow)',
                    marginBottom: '20px',
                }}
            >
                <span
                    style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: 'var(--text-dark)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    📅 بازه زمانی:
                </span>

                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            border: '2px solid var(--gray)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            outline: 'none',
                            background: 'var(--cream-light)',
                            width: '130px',
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                        onFocus={() => {
                            setShowCalendar('start');
                            if (!currentMonth.isValid())
                                setCurrentMonth(moment());
                        }}
                        readOnly
                    />
                    {showCalendar === 'start' && renderCalendar('start')}
                </div>

                <span
                    style={{
                        fontWeight: '500',
                        fontSize: '13px',
                        color: 'var(--primary-light)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    تا
                </span>

                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            border: '2px solid var(--gray)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            outline: 'none',
                            background: 'var(--cream-light)',
                            width: '130px',
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                        onFocus={() => {
                            setShowCalendar('end');
                            if (!currentMonth.isValid())
                                setCurrentMonth(moment());
                        }}
                        readOnly
                    />
                    {showCalendar === 'end' && renderCalendar('end')}
                </div>

                <span
                    style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: 'var(--text-dark)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    🍞 محصول:
                </span>

                {renderProductDropdown()}

                <button
                    onClick={fetchReport}
                    title="نمایش گزارش"
                    aria-label="نمایش گزارش"
                    style={{
                        width: '34px',
                        height: '34px',
                        minWidth: '34px',
                        padding: 0,
                        background: 'var(--gold-soft)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#c49a6e';
                        e.currentTarget.style.transform = 'scale(1.08)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--gold-soft)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    🔍
                </button>

                <button
                    onClick={resetFilters}
                    title="پاک کردن فیلترها"
                    aria-label="پاک کردن فیلترها"
                    style={{
                        width: '34px',
                        height: '34px',
                        minWidth: '34px',
                        padding: 0,
                        background: 'var(--gray)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d5cdc5';
                        e.currentTarget.style.transform = 'scale(1.08)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--gray)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    🔄
                </button>
            </div>

            {report ? (
                <>
                    {/* ============================================================
                        کارت‌های آماری — ۳ کارت (محصول پرفروش حذف شد)
                        ============================================================ */}
                    <div
                        className="stats-grid"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            marginBottom: '24px',
                        }}
                    >
                        <div
                            className="stat-card"
                            style={{
                                flex: '1 1 0',
                                minWidth: '150px',
                                background: 'white',
                                padding: '18px 14px',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                className="stat-number"
                                style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    color: 'var(--text-dark)',
                                    lineHeight: '1.2',
                                }}
                            >
                                {toPersianNumber(report.totalOrders || 0)}
                            </div>
                            <div
                                className="stat-label"
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--primary-light)',
                                    opacity: '0.7',
                                    marginTop: '4px',
                                }}
                            >
                                تعداد سفارش‌ها
                            </div>
                        </div>

                        <div
                            className="stat-card"
                            style={{
                                flex: '1 1 0',
                                minWidth: '150px',
                                background: 'white',
                                padding: '18px 14px',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                className="stat-number"
                                style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    color: 'var(--gold-dark)',
                                    lineHeight: '1.2',
                                }}
                            >
                                {formatPrice(report.totalRevenue || 0)}
                            </div>
                            <div
                                className="stat-label"
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--primary-light)',
                                    opacity: '0.7',
                                    marginTop: '4px',
                                }}
                            >
                                درآمد کل (ریال)
                            </div>
                        </div>

                        <div
                            className="stat-card"
                            style={{
                                flex: '1 1 0',
                                minWidth: '150px',
                                background: 'white',
                                padding: '18px 14px',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                className="stat-number"
                                style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    color: 'var(--text-dark)',
                                    lineHeight: '1.2',
                                }}
                            >
                                {formatPrice(report.averageOrder || 0)}
                            </div>
                            <div
                                className="stat-label"
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--primary-light)',
                                    opacity: '0.7',
                                    marginTop: '4px',
                                }}
                            >
                                میانگین هر سفارش (ریال)
                            </div>
                        </div>
                    </div>

                    {selectedProductId && productStats && (
                        <div
                            style={{
                                background:
                                    'linear-gradient(135deg, #fbefd9, #f6e3c2)',
                                padding: '20px 24px',
                                borderRadius: 'var(--radius)',
                                marginBottom: '32px',
                                border: '2px solid var(--gold-soft)',
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '16px',
                            }}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: 'var(--primary-light)',
                                        fontWeight: '500',
                                    }}
                                >
                                    🍞 محصول انتخابی
                                </div>
                                <div
                                    style={{
                                        fontSize: '22px',
                                        fontWeight: '700',
                                        color: 'var(--text-dark)',
                                    }}
                                >
                                    {productStats.name}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: 'var(--primary-light)',
                                        fontWeight: '500',
                                    }}
                                >
                                    تعداد فروش
                                </div>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        fontWeight: '800',
                                        color: 'var(--gold-dark)',
                                    }}
                                >
                                    {toPersianNumber(productStats.quantity)}{' '}
                                    عدد
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: 'var(--primary-light)',
                                        fontWeight: '500',
                                    }}
                                >
                                    درآمد حاصل
                                </div>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        fontWeight: '800',
                                        color: 'var(--gold-dark)',
                                    }}
                                >
                                    {formatPrice(productStats.revenue)}{' '}
                                    ریال
                                </div>
                            </div>
                        </div>
                    )}

                    {report?.orders && report.orders.length > 0 && (
                        <div
                            className="recent-orders"
                            style={{ marginTop: '32px' }}
                        >
                            <div
                                className="section-header"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '12px',
                                }}
                            >
                                <h2
                                    style={{
                                        fontSize: '20px',
                                        color: 'var(--text-dark)',
                                        margin: 0,
                                    }}
                                >
                                    📋 جزئیات سفارش‌ها
                                </h2>
                                <span
                                    style={{
                                        fontSize: '14px',
                                        color: 'var(--primary-light)',
                                        opacity: '0.7',
                                        marginRight: '8px',
                                    }}
                                >
                                    (
                                    {toPersianNumber(
                                        report.orders.length
                                    )}{' '}
                                    سفارش)
                                </span>
                            </div>
                            <div className="table-wrapper">
                                <table className="order-table">
                                    <thead>
                                    <tr>
                                        <th>شماره</th>
                                        <th>مشتری</th>
                                        <th>تعداد اقلام</th>
                                        <th>مبلغ (ریال)</th>
                                        <th>وضعیت</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {report.orders.map((order) => {
                                        const orderId =
                                            order._id || order.id;
                                        return (
                                            <tr key={orderId}>
                                                <td>
                                                    #
                                                    {toPersianNumber(
                                                        String(
                                                            orderId
                                                        ).slice(-6)
                                                    )}
                                                </td>
                                                <td>
                                                    {order.customerName ||
                                                        'ناشناس'}
                                                </td>
                                                <td>
                                                    {toPersianNumber(
                                                        order.items
                                                            ?.length || 0
                                                    )}
                                                </td>
                                                <td>
                                                    {formatPrice(
                                                        order.totalPrice || 0
                                                    )}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge ${getStatusBadge(
                                                            order.status
                                                        )}`}
                                                    >
                                                        {getStatusText(
                                                            order.status
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <p
                    style={{
                        textAlign: 'center',
                        color: 'var(--primary-light)',
                        opacity: 0.7,
                        padding: '40px 0',
                    }}
                >
                    هیچ داده‌ای برای نمایش وجود ندارد. لطفاً بازه‌ی زمانی و
                    فیلترهای مورد نظر را انتخاب کنید.
                </p>
            )}
        </div>
    );
}

export default Reports;