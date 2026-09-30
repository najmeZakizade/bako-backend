// src/pages/bakery/Orders.jsx
import { useState, useEffect } from 'react';
import {
    getOrders,
    updateOrderStatus,
    markOrderAsDelivered,
    unassignCourierFromOrder,
    assignCourierToOrder,
    getCouriers,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';

const STATUS_MAP = {
    PENDING: 'در انتظار',
    CONFIRMED: 'تأیید شده',
    PREPARING: 'در حال آماده‌سازی',
    READY: 'آماده تحویل',
    DELIVERED: 'تحویل شد',
    CANCELLED: 'لغو شده',
};

const STATUS_BADGE_CLASS = {
    PENDING: 'badge-honey',
    CONFIRMED: 'badge-blue',
    PREPARING: 'badge-orange',
    READY: 'badge-purple',
    DELIVERED: 'badge-herb',
    CANCELLED: 'badge-red',
};

function Orders() {
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [error, setError] = useState(null);

    // ===== مودال تخصیص پیک =====
    const [showCourierModal, setShowCourierModal] = useState(false);
    const [selectedOrderForCourier, setSelectedOrderForCourier] = useState(null);
    const [couriers, setCouriers] = useState([]);
    const [couriersLoading, setCouriersLoading] = useState(false);
    const [selectedCourierId, setSelectedCourierId] = useState(null);
    const [assigning, setAssigning] = useState(false);

    // ============================================================
    //  دریافت سفارشات
    // ============================================================
    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getOrders();
            const data = res.data || [];
            setAllOrders(data);
        } catch (err) {
            console.error('❌ خطا در دریافت سفارش‌ها:', err);
            setError('خطا در دریافت سفارش‌ها. لطفاً مجدداً تلاش کنید.');
            setAllOrders([]);
            showToast('خطا در دریافت سفارش‌ها', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // ============================================================
    //  فیلتر
    // ============================================================
    const filteredOrders = filter === 'ALL'
        ? allOrders
        : allOrders.filter(order => order.status === filter);

    // ============================================================
    //  تغییر وضعیت سفارش
    // ============================================================
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            await fetchOrders();
            showToast(
                `وضعیت سفارش به ${STATUS_MAP[newStatus] || newStatus} تغییر یافت`,
                'success'
            );
        } catch (err) {
            console.error('❌ خطا در تغییر وضعیت:', err);
            showToast('خطا در تغییر وضعیت سفارش', 'error');
        }
    };

    // ============================================================
    //  علامت‌گذاری تحویل‌شده
    // ============================================================
    const handleMarkDelivered = async (orderId) => {
        if (!window.confirm('آیا مطمئن هستید که این سفارش تحویل داده شده است؟')) return;
        try {
            await markOrderAsDelivered(orderId);
            await fetchOrders();
            showToast('✅ سفارش تحویل‌شده علامت خورد.', 'success');
        } catch (err) {
            console.error('❌ خطا:', err);
            showToast('خطا در علامت‌گذاری تحویل', 'error');
        }
    };

    // ============================================================
    //  حذف تخصیص پیک
    // ============================================================
    const handleRemoveCourier = async (orderId, courierName) => {
        if (!window.confirm(
            `آیا از حذف پیک "${courierName || 'نامشخص'}" از این سفارش مطمئن هستید؟`
        )) return;
        try {
            await unassignCourierFromOrder(orderId);
            await fetchOrders();
            showToast('✅ تخصیص پیک حذف شد.', 'success');
        } catch (err) {
            console.error('❌ خطا:', err);
            const msg = err.response?.data?.message || 'خطا در حذف پیک';
            showToast(msg, 'error');
        }
    };

    // ============================================================
    //  باز کردن مودال تخصیص پیک
    // ============================================================
    const openCourierModal = async (order) => {
        setSelectedOrderForCourier(order);
        setSelectedCourierId(null);
        setShowCourierModal(true);
        setCouriersLoading(true);

        try {
            const res = await getCouriers();
            const data = res.data || [];
            const activeCouriers = data.filter(c => c.enabled !== false);
            setCouriers(activeCouriers);
        } catch (err) {
            console.error('❌ خطا در دریافت پیک‌ها:', err);
            showToast('خطا در دریافت لیست پیک‌ها', 'error');
            setCouriers([]);
        } finally {
            setCouriersLoading(false);
        }
    };

    const closeCourierModal = () => {
        setShowCourierModal(false);
        setSelectedOrderForCourier(null);
        setSelectedCourierId(null);
        setCouriers([]);
    };

    // ============================================================
    //  تخصیص پیک به سفارش
    // ============================================================
    const handleAssignCourier = async () => {
        if (!selectedCourierId) {
            showToast('لطفاً یک پیک انتخاب کنید', 'error');
            return;
        }
        if (!selectedOrderForCourier) return;

        const orderId = selectedOrderForCourier._id || selectedOrderForCourier.id;

        setAssigning(true);
        try {
            await assignCourierToOrder(orderId, selectedCourierId);
            showToast('✅ پیک با موفقیت تخصیص یافت.', 'success');
            closeCourierModal();
            await fetchOrders();
        } catch (err) {
            console.error('❌ خطا در تخصیص پیک:', err);
            const msg = err.response?.data?.message || 'خطا در تخصیص پیک';
            showToast(msg, 'error');
        } finally {
            setAssigning(false);
        }
    };

    // ============================================================
    //  Helper ها
    // ============================================================
    const statusOptions = [
        { value: 'ALL', label: 'همه' },
        { value: 'PENDING', label: STATUS_MAP.PENDING },
        { value: 'CONFIRMED', label: STATUS_MAP.CONFIRMED },
        { value: 'PREPARING', label: STATUS_MAP.PREPARING },
        { value: 'READY', label: STATUS_MAP.READY },
        { value: 'DELIVERED', label: STATUS_MAP.DELIVERED },
        { value: 'CANCELLED', label: STATUS_MAP.CANCELLED },
    ];

    const getStatusBadge = (status) => STATUS_BADGE_CLASS[status] || 'badge-gray';
    const getStatusText = (status) => STATUS_MAP[status] || status;
    const getOrderId = (order) => order._id || order.id;

    const getDeliveryMethodBadge = (method) => {
        if (method === 'DELIVERY') {
            return <span className="badge badge-blue">🛵 پیک</span>;
        }
        return <span className="badge badge-gray">📍 حضوری</span>;
    };

    const needsCourierAssignment = (order) => {
        return order.deliveryMethod === 'DELIVERY'
            && (!order.courierId || order.courierId === '')
            && order.status !== 'DELIVERED'
            && order.status !== 'CANCELLED';
    };

    const isDelivery = (order) => order.deliveryMethod === 'DELIVERY';

    const isCustomerReceived = (order) => {
        if (order.customerReceived === true) return true;
        if (order.deliveryMethod !== 'DELIVERY') return true;
        return false;
    };

    // ============================================================
    //  رندر
    // ============================================================
    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ در حال بارگذاری...</div>;
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '50px', color: '#721c24' }}>
                <p>❌ {error}</p>
                <button
                    onClick={fetchOrders}
                    style={{ marginTop: '16px', padding: '8px 24px', cursor: 'pointer' }}
                >
                    🔄 تلاش مجدد
                </button>
            </div>
        );
    }

    return (
        <div className="orders-management">

            {/* ===== فیلتر ===== */}
            <div className="filter-bar">
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <button onClick={fetchOrders}>🔄 بروزرسانی</button>
            </div>

            {/* ===== جدول سفارشات ===== */}
            {filteredOrders.length === 0 ? (
                <p style={{
                    textAlign: 'center',
                    padding: '30px',
                    color: '#6b3f2b',
                    opacity: 0.7,
                }}>
                    هیچ سفارشی با وضعیت "{statusOptions.find(o => o.value === filter)?.label}" وجود ندارد.
                </p>
            ) : (
                <div className="table-wrapper">
                    <table className="order-table responsive-cards-table">
                        <thead>
                        <tr>
                            <th>شماره</th>
                            <th>مشتری</th>
                            <th>نوع</th>
                            <th>مبلغ کل(ریال)</th>
                            <th>هزینه پیک(ریال)</th>
                            <th>پیک</th>
                            <th>دریافت مشتری</th>
                            <th>عملیات</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredOrders.map((order) => {
                            const orderId = getOrderId(order);
                            const hasCourier = !!order.courierId;
                            const delivery = isDelivery(order);
                            const deliveryPrice = Number(order.deliveryPrice) || 0;
                            const needsCourier = needsCourierAssignment(order);
                            const received = isCustomerReceived(order);

                            return (
                                <tr key={orderId}>
                                    {/* شماره */}
                                    <td data-label="شماره">
                                        #{toPersianNumber(String(orderId).slice(-6))}
                                    </td>

                                    {/* مشتری */}
                                    <td data-label="مشتری">
                                        {order.customerName || 'ناشناس'}
                                    </td>

                                    {/* نوع */}
                                    <td data-label="نوع">
                                        {getDeliveryMethodBadge(order.deliveryMethod)}
                                    </td>

                                    {/* مبلغ کل */}
                                    <td data-label="مبلغ کل (ریال)">
                                        {formatPrice(order.totalPrice || 0)}
                                    </td>

                                    {/* هزینه پیک */}
                                    <td data-label="هزینه پیک (ریال)">
                                        {delivery && deliveryPrice > 0 ? (
                                            <span style={{
                                                color: 'var(--gold-dark)',
                                                fontWeight: '700',
                                                fontSize: '11.5px',
                                            }}>
                                                {formatPrice(deliveryPrice)}
                                            </span>
                                        ) : (
                                            <span style={{
                                                color: 'var(--primary-light)',
                                                fontSize: '11px',
                                            }}>
                                                —
                                            </span>
                                        )}
                                    </td>

                                    {/* پیک */}
                                    <td data-label="پیک">
                                        {hasCourier ? (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '2px',
                                            }}>
                                                <span style={{
                                                    fontWeight: '700',
                                                    fontSize: '11.5px',
                                                    color: 'var(--text-dark)',
                                                }}>
                                                    {order.courierName || '—'}
                                                </span>
                                                {order.courierPhone && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        color: 'var(--primary-light)',
                                                    }}>
                                                        {toPersianNumber(order.courierPhone)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : delivery ? (
                                            <span className="badge badge-red" style={{ fontSize: '9.5px' }}>
                                                بدون پیک
                                            </span>
                                        ) : (
                                            <span style={{
                                                color: 'var(--primary-light)',
                                                fontSize: '11px',
                                            }}>
                                                —
                                            </span>
                                        )}
                                    </td>

                                    {/* دریافت مشتری */}
                                    <td data-label="دریافت مشتری">
                                        {received ? (
                                            <span className="received-badge">
                                                ✅
                                            </span>
                                        ) : (
                                            <span className="pending-badge">
                                                ⏳ در انتظار
                                            </span>
                                        )}
                                    </td>

                                    {/* عملیات */}
                                    <td data-label="عملیات">
                                        <div style={{
                                            display: 'flex',
                                            gap: '4px',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexWrap: 'wrap',
                                        }}>
                                            {/* دکمه تخصیص پیک */}
                                            {needsCourier && (
                                                <button
                                                    onClick={() => openCourierModal(order)}
                                                    title="تخصیص پیک"
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '10px',
                                                        background: 'var(--gold-dark)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: '700',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    🚴 تخصیص پیک
                                                </button>
                                            )}

                                            {/* دراپ‌داون تغییر وضعیت */}
                                            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(orderId, e.target.value)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '11px',
                                                    }}
                                                >
                                                    <option value="PENDING">در انتظار</option>
                                                    <option value="CONFIRMED">تأیید شده</option>
                                                    <option value="PREPARING">در حال آماده‌سازی</option>
                                                    <option value="READY">آماده تحویل</option>
                                                    <option value="DELIVERED">تحویل شد</option>
                                                    <option value="CANCELLED">لغو شد</option>
                                                </select>
                                            )}

                                            {/* دکمه تحویل سریع */}
                                            {order.status === 'READY' && hasCourier && (
                                                <button
                                                    onClick={() => handleMarkDelivered(orderId)}
                                                    title="علامت‌گذاری تحویل‌شده"
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '11px',
                                                        background: 'var(--green)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    ✅ تحویل شد
                                                </button>
                                            )}

                                            {/* دکمه حذف پیک */}
                                            {hasCourier
                                                && order.status !== 'DELIVERED'
                                                && order.status !== 'CANCELLED' && (
                                                    <button
                                                        onClick={() => handleRemoveCourier(orderId, order.courierName)}
                                                        title="حذف پیک"
                                                        style={{
                                                            padding: '4px 6px',
                                                            fontSize: '13px',
                                                            background: 'transparent',
                                                            color: 'var(--red)',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            borderRadius: '6px',
                                                        }}
                                                    >
                                                        🚫
                                                    </button>
                                                )}

                                            {order.status === 'DELIVERED' && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: 'var(--green-dark)',
                                                    fontWeight: '700',
                                                }}>
                                                    ✅ تحویل شد
                                                </span>
                                            )}
                                            {order.status === 'CANCELLED' && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: 'var(--red)',
                                                    fontWeight: '700',
                                                }}>
                                                    ❌ لغو شد
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ============================================================ */}
            {/*  مودال تخصیص پیک                                            */}
            {/* ============================================================ */}
            {showCourierModal && selectedOrderForCourier && (
                <div
                    className="modal-overlay"
                    onClick={closeCourierModal}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(44, 24, 16, 0.55)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--card-bg)',
                            borderRadius: 'var(--radius-lg)',
                            maxWidth: '560px',
                            width: '100%',
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(44, 24, 16, 0.35)',
                            border: '1px solid #eee4db',
                            direction: 'rtl',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid #eadfd4',
                            background: 'linear-gradient(135deg, #4a2c1a 0%, #2c1810 100%)',
                            borderTopRightRadius: 'var(--radius-lg)',
                            borderTopLeftRadius: 'var(--radius-lg)',
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: '800',
                                color: 'var(--gold-text)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                🚴 تخصیص پیک به سفارش
                            </h3>
                            <button
                                onClick={closeCourierModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--gold-text)',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    lineHeight: 1,
                                    fontWeight: '700',
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '16px 20px' }}>

                            <div style={{
                                background: '#fdf6ec',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius)',
                                marginBottom: '14px',
                                border: '1px solid #f0e2cc',
                                fontSize: '12px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ color: 'var(--primary-light)', fontWeight: '600' }}>شماره سفارش:</span>
                                    <strong>#{toPersianNumber(String(getOrderId(selectedOrderForCourier)).slice(-6))}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ color: 'var(--primary-light)', fontWeight: '600' }}>مشتری:</span>
                                    <strong>{selectedOrderForCourier.customerName || 'ناشناس'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--primary-light)', fontWeight: '600' }}>آدرس:</span>
                                    <span style={{
                                        fontSize: '11px',
                                        maxWidth: '65%',
                                        textAlign: 'left',
                                        color: 'var(--text-dark)',
                                    }}>
                                        {selectedOrderForCourier.address || '—'}
                                    </span>
                                </div>
                            </div>

                            <h4 style={{
                                fontSize: '12.5px',
                                fontWeight: '700',
                                color: 'var(--text-dark)',
                                margin: '0 0 10px 0',
                            }}>
                                🛵 انتخاب پیک:
                            </h4>

                            {couriersLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--primary-light)' }}>
                                    ⏳ در حال بارگذاری...
                                </div>
                            ) : couriers.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '24px 12px',
                                    background: '#f8d7da',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid #f5c2c7',
                                    color: '#721c24',
                                    fontSize: '12px',
                                }}>
                                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🛵</div>
                                    هیچ پیک فعالی یافت نشد.
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    maxHeight: '320px',
                                    overflowY: 'auto',
                                    padding: '2px',
                                }}>
                                    {couriers.map((courier) => {
                                        const courierId = courier.id || courier._id;
                                        const isSelected = String(selectedCourierId) === String(courierId);
                                        return (
                                            <button
                                                key={courierId}
                                                type="button"
                                                onClick={() => setSelectedCourierId(courierId)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '10px 12px',
                                                    background: isSelected
                                                        ? 'linear-gradient(135deg, #fbefd9 0%, #f6e3c2 100%)'
                                                        : 'white',
                                                    border: isSelected
                                                        ? '2px solid var(--gold-dark)'
                                                        : '1.5px solid #eee4db',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    textAlign: 'right',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 0.22s ease',
                                                    width: '100%',
                                                }}
                                            >
                                                <div style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #4a2c1a 0%, #2c1810 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '18px',
                                                    flexShrink: 0,
                                                    border: '2px solid var(--gold-soft)',
                                                }}>
                                                    👤
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '12.5px',
                                                        fontWeight: '800',
                                                        color: 'var(--text-dark)',
                                                        marginBottom: '2px',
                                                    }}>
                                                        {courier.fullName || 'نامشخص'}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '10.5px',
                                                        color: 'var(--primary-light)',
                                                        marginBottom: '1px',
                                                    }}>
                                                        📞 {toPersianNumber(courier.phone || '—')}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '10px',
                                                        color: 'var(--primary-light)',
                                                        opacity: 0.85,
                                                    }}>
                                                        {courier.vehicleType === 'MOTORCYCLE' && '🏍️ موتورسیکلت'}
                                                        {courier.vehicleType === 'CAR' && '🚗 خودرو'}
                                                        {courier.vehicleType === 'BICYCLE' && '🚲 دوچرخه'}
                                                        {!['MOTORCYCLE', 'CAR', 'BICYCLE'].includes(courier.vehicleType)
                                                            && (courier.vehicleType || '—')}
                                                        {courier.vehiclePlate && ` · ${courier.vehiclePlate}`}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        background: 'var(--gold-dark)',
                                                        color: 'white',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '13px',
                                                        fontWeight: '900',
                                                        flexShrink: 0,
                                                    }}>
                                                        ✓
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            borderTop: '1px solid #eadfd4',
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'flex-end',
                            background: '#faf5ee',
                            borderBottomRightRadius: 'var(--radius-lg)',
                            borderBottomLeftRadius: 'var(--radius-lg)',
                        }}>
                            <button
                                onClick={closeCourierModal}
                                disabled={assigning}
                                style={{
                                    padding: '8px 18px',
                                    background: 'var(--gray)',
                                    color: 'var(--text-dark)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: assigning ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit',
                                    opacity: assigning ? 0.6 : 1,
                                }}
                            >
                                ✖ انصراف
                            </button>
                            <button
                                onClick={handleAssignCourier}
                                disabled={!selectedCourierId || assigning || couriers.length === 0}
                                style={{
                                    padding: '8px 22px',
                                    background: !selectedCourierId || assigning || couriers.length === 0
                                        ? '#ccc'
                                        : 'linear-gradient(135deg, #2d6a4f 0%, #1b4d3e 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: '800',
                                    cursor: !selectedCourierId || assigning || couriers.length === 0
                                        ? 'not-allowed'
                                        : 'pointer',
                                    fontFamily: 'inherit',
                                    letterSpacing: '0.3px',
                                    boxShadow: !selectedCourierId || assigning
                                        ? 'none'
                                        : '0 4px 12px rgba(45, 106, 79, 0.3)',
                                }}
                            >
                                {assigning ? '⏳ در حال تخصیص...' : '✅ تخصیص پیک'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Orders;