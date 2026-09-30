// src/pages/bakery/Dashboard.jsx
import { useState, useEffect } from 'react';
import { getOrders, getProducts } from '../../services/api';
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

function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        pendingOrders: 0,
    });
    const [productSales, setProductSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, productsRes] = await Promise.all([
                    getOrders(),
                    getProducts(),
                ]);
                const ordersData = ordersRes.data || [];
                const productsData = productsRes.data || [];

                setOrders(ordersData);
                setProducts(productsData);

                /* ============================================================
                   🎯 درآمد کل = جمع order.totalPrice (منبع واحد با Reports)
                   ============================================================ */
                const totalRevenue = ordersData.reduce(
                    (sum, order) =>
                        sum + (Number(order.totalPrice) || 0),
                    0
                );

                /* ============================================================
                   محاسبه فروش هر محصول (برای گرید کارت‌ها)
                   ============================================================ */
                const productMap = {};
                productsData.forEach((product) => {
                    const name = (product.name || '').trim();
                    if (!name) return;

                    let imageUrl =
                        product.imageUrl || '/images/default-bread.png';
                    if (imageUrl && !imageUrl.startsWith('/')) {
                        imageUrl = '/' + imageUrl;
                    }

                    productMap[name] = {
                        name: name,
                        imageUrl: imageUrl,
                        revenue: 0,
                        count: 0,
                    };
                });

                ordersData.forEach((order) => {
                    if (!order.items || !Array.isArray(order.items)) return;

                    order.items.forEach((item) => {
                        const itemName = getItemName(item).trim();
                        if (!itemName) return;

                        const price = getItemPrice(item);
                        const quantity = getItemQty(item);
                        const revenue = price * quantity;

                        const productEntry = productMap[itemName];
                        if (productEntry) {
                            productEntry.revenue += revenue;
                            productEntry.count += quantity;
                        } else {
                            productMap[itemName] = {
                                name: itemName,
                                imageUrl:
                                    item.productImageUrl ||
                                    '/images/default-bread.png',
                                revenue: revenue,
                                count: quantity,
                            };
                        }
                    });
                });

                const sortedSales = Object.values(productMap).sort(
                    (a, b) => b.revenue - a.revenue
                );

                const pendingOrders = ordersData.filter(
                    (o) =>
                        o.status === 'PENDING' ||
                        o.status === 'CONFIRMED' ||
                        o.status === 'PREPARING'
                ).length;

                setStats({
                    totalOrders: ordersData.length,
                    totalRevenue,
                    totalProducts: productsData.length,
                    pendingOrders,
                });
                setProductSales(sortedSales);
                setError(null);
            } catch (err) {
                console.error('❌ خطا:', err);
                setError('خطا در بارگذاری داده‌ها.');
                setOrders([]);
                setProducts([]);
                setStats({
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalProducts: 0,
                    pendingOrders: 0,
                });
                setProductSales([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading)
        return (
            <div className="dashboard-loading">
                <div className="spinner" />
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    if (error)
        return (
            <div className="dashboard-error">
                <span className="error-icon">❌</span>
                <p>{error}</p>
            </div>
        );

    const recentOrders = orders.slice(-5).reverse();

    /* ============================================================
       نمایش هزینه پیک
       ============================================================ */
    const renderDeliveryFee = (order) => {
        if (order.deliveryMethod !== 'DELIVERY') {
            return (
                <span
                    style={{
                        color: 'var(--primary-light)',
                        fontSize: '11px',
                    }}
                >
                    —
                </span>
            );
        }
        if (!order.courierId) {
            return (
                <span
                    className="badge badge-red"
                    style={{ fontSize: '9.5px' }}
                >
                    بدون پیک
                </span>
            );
        }
        const fee = Number(order.deliveryPrice) || 0;
        if (fee <= 0) {
            return (
                <span
                    style={{
                        color: 'var(--primary-light)',
                        fontSize: '11px',
                    }}
                >
                    —
                </span>
            );
        }
        return (
            <span
                style={{
                    fontWeight: '700',
                    color: 'var(--gold-dark)',
                    fontSize: '11.5px',
                }}
            >
                {formatPrice(fee)}
            </span>
        );
    };

    return (
        <div className="dashboard">
            <div className="stats-grid">
                {[
                    {
                        label: 'کل سفارش‌ها',
                        value: toPersianNumber(stats.totalOrders),
                        icon: 'orders-icon.png',
                    },
                    {
                        label: 'درآمد کل (ریال)',
                        value: formatPrice(stats.totalRevenue),
                        icon: 'revenue-icon.png',
                    },
                    {
                        label: 'محصولات فعال',
                        value: toPersianNumber(stats.totalProducts),
                        icon: 'products-icon.png',
                    },
                    {
                        label: 'سفارش‌های در انتظار',
                        value: toPersianNumber(stats.pendingOrders),
                        icon: 'pending-icon.png',
                    },
                ].map((item, idx) => (
                    <div className="stat-card" key={idx}>
                        <img
                            src={`/images/dashboard/${item.icon}`}
                            alt={item.label}
                            className="stat-icon-img"
                            onError={(e) =>
                                (e.target.src =
                                    '/images/dashboard/default-icon.png')
                            }
                        />
                        <div className="stat-number">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                    </div>
                ))}
            </div>

            <div className="product-sales">
                <div className="section-header">
                    <img
                        src="/images/sidebar/products-icon.png"
                        alt="محصولات"
                        className="section-icon"
                        onError={(e) =>
                            (e.target.src =
                                '/images/sidebar/default-icon.png')
                        }
                    />
                    <h2>درآمد هر محصول</h2>
                </div>
                {productSales.length === 0 ? (
                    <p className="empty-state">
                        هیچ داده‌ای برای نمایش وجود ندارد.
                    </p>
                ) : (
                    <div
                        className="sales-grid-modern"
                        style={{
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}
                    >
                        {productSales.map((item, idx) => (
                            <div key={idx} className="sales-card-modern">
                                <div className="sales-image-wrapper">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="sales-product-image"
                                        onError={(e) =>
                                            (e.target.src =
                                                '/images/default-bread.png')
                                        }
                                    />
                                </div>
                                <div className="sales-info">
                                    <div className="sales-name">
                                        {item.name}
                                    </div>
                                    <div className="sales-details">
                                        <div className="sales-count">
                                            <span className="sales-label">
                                                تعداد فروش:
                                            </span>
                                            <span className="sales-value">
                                                {toPersianNumber(
                                                    item.count
                                                )}{' '}
                                                عدد
                                            </span>
                                        </div>
                                        <div className="sales-revenue">
                                            <span className="sales-label">
                                                درآمد:
                                            </span>
                                            <span className="sales-value">
                                                {formatPrice(item.revenue)}{' '}
                                                ریال
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="recent-orders">
                <div className="section-header">
                    <img
                        src="/images/sidebar/orders-icon.png"
                        alt="سفارش‌ها"
                        className="section-icon"
                        onError={(e) =>
                            (e.target.src =
                                '/images/sidebar/default-icon.png')
                        }
                    />
                    <h2>آخرین سفارش‌ها</h2>
                </div>
                {recentOrders.length === 0 ? (
                    <p className="empty-state">
                        هیچ سفارشی ثبت نشده است.
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table className="order-table responsive-cards-table">
                            <thead>
                            <tr>
                                <th>شماره</th>
                                <th>مشتری</th>
                                <th>مبلغ (ریال)</th>
                                <th>هزینه پیک (ریال)</th>
                                <th>وضعیت</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentOrders.map((order) => (
                                <tr key={order._id || order.id}>
                                    <td data-label="شماره">
                                        #
                                        {toPersianNumber(
                                            String(
                                                order._id ||
                                                order.id ||
                                                ''
                                            ).slice(-6)
                                        )}
                                    </td>
                                    <td data-label="مشتری">
                                        {order.customerName || 'ناشناس'}
                                    </td>
                                    <td data-label="مبلغ (ریال)">
                                        <span
                                            style={{
                                                fontWeight: '700',
                                                color: 'var(--text-dark)',
                                            }}
                                        >
                                            {formatPrice(
                                                order.totalPrice || 0
                                            )}
                                        </span>
                                    </td>
                                    <td data-label="هزینه پیک (ریال)">
                                        {renderDeliveryFee(order)}
                                    </td>
                                    <td data-label="وضعیت">
                                        <span
                                            className={`badge ${
                                                STATUS_BADGE_CLASS[
                                                    order.status
                                                    ] || 'badge-gray'
                                            }`}
                                        >
                                            {STATUS_MAP[order.status] ||
                                                order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;