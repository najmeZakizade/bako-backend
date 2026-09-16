// src/pages/monitoring/MonitoringReportsPage.jsx
import { useState, useEffect } from 'react';
import {
    getMonitoringRevenueByTenant,
    getMonitoringTopProducts,
    getMonitoringRevenueTimeline,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import '../../styles/super-admin.css';
import '../../styles/monitoring.css';

// ============================================================
//  🆕 تبدیل تاریخ میلادی به شمسی
// ============================================================

/**
 * تاریخ کامل شمسی — مثل: ۱۴۰۳/۱۰/۲۵
 */
function toShamsiFull(isoDate) {
    if (!isoDate) return '';
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        return d.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch {
        return isoDate;
    }
}

/**
 * تاریخ کوتاه شمسی — مثل: ۱۰/۲۵ (برای محور X)
 */
function toShamsiShort(isoDate) {
    if (!isoDate) return '';
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        const parts = d
            .toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            })
            .split('/');
        // parts = [سال, ماه, روز]
        if (parts.length >= 3) {
            return `${parts[1]}/${parts[2]}`;
        }
        return parts.join('/');
    } catch {
        return isoDate;
    }
}

// ============================================================
//  فرمت کوتاه برای محور Y
// ============================================================
function formatShortNumber(value) {
    if (!value || value === 0) return '۰';
    const abs = Math.abs(value);
    if (abs < 1000) return toPersianNumber(Math.round(value));
    if (abs < 1_000_000) {
        const n = (value / 1000).toFixed(1).replace(/\.0$/, '');
        return toPersianNumber(n) + 'K';
    }
    if (abs < 1_000_000_000) {
        const n = (value / 1_000_000).toFixed(1).replace(/\.0$/, '');
        return toPersianNumber(n) + 'M';
    }
    const n = (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return toPersianNumber(n) + 'B';
}

// ============================================================
//  آیکون هدر صفحه
// ============================================================
function ReportIcon({ src, fallback, alt, className = 'admin-header-icon' }) {
    const [errored, setErrored] = useState(false);

    if (errored) {
        return (
            <span className={`${className}-fallback`} aria-hidden="true" title={alt}>
                {fallback}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setErrored(true)}
            draggable={false}
        />
    );
}

// ============================================================
//  کارت آمار با آیکون تصویری
// ============================================================
function ReportStatCard({ variant = '', icon, fallback, alt, value, label }) {
    const [iconErrored, setIconErrored] = useState(false);

    return (
        <div className={`admin-stat-card ${variant}`}>
            <div className="admin-stat-header">
                {!iconErrored ? (
                    <img
                        src={icon}
                        alt={alt}
                        className="admin-stat-icon-img"
                        onError={() => setIconErrored(true)}
                        draggable={false}
                    />
                ) : (
                    <span className="admin-stat-icon-fallback" title={alt}>
                        {fallback}
                    </span>
                )}
            </div>
            <div className="admin-stat-number">{value}</div>
            <div className="admin-stat-label">{label}</div>
        </div>
    );
}

// ============================================================
//  آیکون کوچک هدر بخش‌ها
// ============================================================
function SectionIcon({ src, fallback, alt }) {
    const [errored, setErrored] = useState(false);

    if (errored) {
        return (
            <span className="mon-section-icon mon-section-icon-emoji" title={alt}>
                {fallback}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className="mon-section-icon mon-section-icon-img"
            onError={() => setErrored(true)}
            draggable={false}
        />
    );
}

// ============================================================
//  نمودار خطی درآمد با Area + Tooltip + تاریخ شمسی
// ============================================================
function RevenueLineChart({ data }) {
    const [hoveredPoint, setHoveredPoint] = useState(null);

    if (!data || data.length === 0) {
        return <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>;
    }

    const WIDTH = 1000;
    const HEIGHT = 300;
    const PADDING = { top: 20, right: 30, bottom: 45, left: 65 };

    const chartW = WIDTH - PADDING.left - PADDING.right;
    const chartH = HEIGHT - PADDING.top - PADDING.bottom;

    const maxRev = Math.max(...data.map((d) => d.revenue || 0), 1);

    const points = data.map((d, i) => {
        const x = PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = PADDING.top + chartH - ((d.revenue || 0) / maxRev) * chartH;
        return { x, y, ...d, index: i };
    });

    const linePath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');

    const baselineY = PADDING.top + chartH;
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

    const yTicks = Array.from({ length: 5 }, (_, i) => {
        const ratio = 1 - i / 4;
        return {
            value: maxRev * ratio,
            y: PADDING.top + (i / 4) * chartH,
        };
    });

    const step = data.length > 20 ? 5 : data.length > 10 ? 3 : 2;
    const xTicks = points.filter(
        (_, i) => i % step === 0 || i === data.length - 1
    );

    return (
        <div className="mon-chart-wrapper">
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="mon-line-chart"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient id="monAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f5a623" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#f5a623" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="monLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#d4a373" />
                        <stop offset="50%" stopColor="#f5a623" />
                        <stop offset="100%" stopColor="#e0991a" />
                    </linearGradient>
                </defs>

                {/* خطوط راهنمای افقی + برچسب Y */}
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line
                            x1={PADDING.left}
                            y1={tick.y}
                            x2={WIDTH - PADDING.right}
                            y2={tick.y}
                            stroke="#f0ebe7"
                            strokeWidth="1"
                            strokeDasharray={i === yTicks.length - 1 ? '0' : '4 4'}
                        />
                        <text
                            x={PADDING.left - 8}
                            y={tick.y + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="#6b3f2b"
                            fontWeight="700"
                            fontFamily="inherit"
                        >
                            {formatShortNumber(tick.value)}
                        </text>
                    </g>
                ))}

                {/* ناحیه */}
                <path d={areaPath} fill="url(#monAreaGrad)" />

                {/* خط */}
                <path
                    d={linePath}
                    fill="none"
                    stroke="url(#monLineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* نقاط */}
                {points.map((p) => {
                    const isHovered = hoveredPoint?.date === p.date;
                    return (
                        <g key={p.date}>
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="14"
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredPoint(p)}
                                onMouseLeave={() => setHoveredPoint(null)}
                            />
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={isHovered ? 6 : 3.5}
                                fill="#ffffff"
                                stroke="#f5a623"
                                strokeWidth={isHovered ? 3 : 2}
                                style={{
                                    transition:
                                        'r 0.15s ease, stroke-width 0.15s ease',
                                    pointerEvents: 'none',
                                }}
                            />
                        </g>
                    );
                })}

                {/* 🆕 برچسب‌های X به تاریخ شمسی */}
                {xTicks.map((p) => (
                    <text
                        key={p.date}
                        x={p.x}
                        y={HEIGHT - PADDING.bottom + 20}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#6b3f2b"
                        fontWeight="700"
                        fontFamily="inherit"
                    >
                        {toShamsiShort(p.date)}
                    </text>
                ))}
            </svg>

            {/* Tooltip — تاریخ شمسی */}
            {hoveredPoint && (
                <div
                    className="mon-chart-tooltip"
                    style={{
                        left: `${(hoveredPoint.x / WIDTH) * 100}%`,
                        top: `${(hoveredPoint.y / HEIGHT) * 100}%`,
                    }}
                >
                    <div className="mon-tooltip-row mon-tooltip-date">
                        📅 {toShamsiFull(hoveredPoint.date)}
                    </div>
                    <div className="mon-tooltip-row mon-tooltip-value">
                        💰 {formatPrice(hoveredPoint.revenue)} ریال
                    </div>
                    <div className="mon-tooltip-row mon-tooltip-orders">
                        📦 {toPersianNumber(hoveredPoint.orderCount)} سفارش
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
//  صفحه اصلی
// ============================================================
function MonitoringReportsPage() {
    const [revenueByTenant, setRevenueByTenant] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [revRes, prodRes, timeRes] = await Promise.allSettled([
                    getMonitoringRevenueByTenant(),
                    getMonitoringTopProducts(10),
                    getMonitoringRevenueTimeline(30),
                ]);
                if (revRes.status === 'fulfilled')
                    setRevenueByTenant(revRes.value.data || []);
                if (prodRes.status === 'fulfilled')
                    setTopProducts(prodRes.value.data || []);
                if (timeRes.status === 'fulfilled')
                    setTimeline(timeRes.value.data || []);
            } catch (err) {
                console.error('❌ خطا در دریافت گزارشات:', err);
                showToast('خطا در دریافت گزارشات', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    const totalRevenue = revenueByTenant.reduce(
        (sum, r) => sum + (r.revenue || 0),
        0
    );
    const totalOrders = revenueByTenant.reduce(
        (sum, r) => sum + (r.orderCount || 0),
        0
    );
    const maxTenantRevenue = Math.max(
        ...revenueByTenant.map((r) => r.revenue || 0),
        1
    );

    const timelineTotal = timeline.reduce((s, t) => s + (t.revenue || 0), 0);
    const timelineAvg =
        timeline.length > 0 ? timelineTotal / timeline.length : 0;
    const timelineBest = timeline.reduce(
        (best, day) =>
            (day.revenue || 0) > (best.revenue || 0) ? day : best,
        timeline[0] || { revenue: 0, date: '' }
    );

    return (
        <div className="monitoring-reports-page">
            {/* ===== هدر ===== */}
            <div className="admin-dashboard-header">
                <h1>
                    <ReportIcon
                        src="/monitoring-reports-icons/reports.png"
                        fallback="📈"
                        alt="گزارشات"
                        className="admin-header-icon"
                    />
                    گزارشات
                </h1>
                <p className="admin-subtitle">
                    تحلیل درآمد و عملکرد سیستم
                </p>
            </div>

            {/* ===== 🆕 ۳ کارت inline ===== */}
            <div className="monitoring-reports-page-cards">
                <ReportStatCard
                    variant="gold"
                    icon="/monitoring-reports-icons/total-revenue.png"
                    fallback="💰"
                    alt="درآمد کل"
                    value={formatPrice(totalRevenue)}
                    label="درآمد کل (ریال)"
                />

                <ReportStatCard
                    variant="green"
                    icon="/monitoring-reports-icons/total-orders.png"
                    fallback="📦"
                    alt="کل سفارشات"
                    value={toPersianNumber(totalOrders)}
                    label="کل سفارشات پرداخت‌شده"
                />

                <ReportStatCard
                    variant="blue"
                    icon="/monitoring-reports-icons/tenants-with-sales.png"
                    fallback="🏪"
                    alt="نانوایی دارای فروش"
                    value={toPersianNumber(revenueByTenant.length)}
                    label="نانوایی دارای فروش"
                />
            </div>

            {/* ===== نمودار ===== */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <SectionIcon
                            src="/monitoring-reports-icons/chart.png"
                            fallback="📈"
                            alt="نمودار درآمد"
                        />
                        درآمد ۳۰ روز اخیر
                    </h3>
                </div>

                {timeline.length > 0 && (
                    <div className="mon-chart-mini-stats">
                        <div className="mon-mini-stat">
                            <span className="mon-mini-stat-label">
                                مجموع ۳۰ روز
                            </span>
                            <span className="mon-mini-stat-value">
                                {formatPrice(timelineTotal)}
                                <small> ریال</small>
                            </span>
                        </div>
                        <div className="mon-mini-stat">
                            <span className="mon-mini-stat-label">
                                میانگین روزانه
                            </span>
                            <span className="mon-mini-stat-value">
                                {formatPrice(Math.round(timelineAvg))}
                                <small> ریال</small>
                            </span>
                        </div>
                        <div className="mon-mini-stat">
                            <span className="mon-mini-stat-label">
                                بهترین روز
                            </span>
                            <span className="mon-mini-stat-value">
                                {formatPrice(timelineBest.revenue || 0)}
                                <small> ریال</small>
                            </span>
                            <span className="mon-mini-stat-extra">
                                {toShamsiFull(timelineBest.date)}
                            </span>
                        </div>
                    </div>
                )}

                <RevenueLineChart data={timeline} />
            </div>

            {/* ===== درآمد به تفکیک ===== */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <SectionIcon
                            src="/monitoring-reports-icons/revenue-by-tenant.png"
                            fallback="🏆"
                            alt="درآمد به تفکیک نانوایی"
                        />
                        درآمد به تفکیک نانوایی
                    </h3>
                </div>

                {revenueByTenant.length === 0 ? (
                    <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>
                ) : (
                    <div className="sa-hbar-list">
                        {revenueByTenant.map((r) => {
                            const width = Math.max(
                                4,
                                ((r.revenue || 0) / maxTenantRevenue) * 100
                            );
                            return (
                                <div key={r.tenantId} className="sa-hbar-item">
                                    <div className="sa-hbar-info">
                                        <span className="sa-hbar-name">
                                            {r.tenantName}
                                        </span>
                                        <span className="sa-hbar-stats">
                                            {toPersianNumber(r.orderCount)} سفارش
                                        </span>
                                    </div>
                                    <div className="sa-hbar-track">
                                        <div
                                            className="sa-hbar-fill"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                    <span className="sa-hbar-value">
                                        {formatPrice(r.revenue)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===== پرفروش‌ها ===== */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <h3>
                        <SectionIcon
                            src="/monitoring-reports-icons/top-products.png"
                            fallback="🥇"
                            alt="محصولات پرفروش"
                        />
                        ۱۰ محصول پرفروش
                    </h3>
                </div>

                {topProducts.length === 0 ? (
                    <p className="empty-text">داده‌ای برای نمایش وجود ندارد</p>
                ) : (
                    <div className="sa-table-wrapper">
                        <table className="sa-table sa-table--products">
                            <thead>
                            <tr>
                                <th>رتبه</th>
                                <th>تصویر</th>
                                <th>نام محصول</th>
                                <th>نانوایی</th>
                                <th>قیمت</th>
                                <th>فروش رفته</th>
                            </tr>
                            </thead>
                            <tbody>
                            {topProducts.map((p, idx) => (
                                <tr key={p.productId}>
                                    <td className="sa-cell-rank">
                                        {toPersianNumber(idx + 1)}
                                    </td>
                                    <td>
                                        {p.imageUrl ? (
                                            <img
                                                src={p.imageUrl}
                                                alt={p.name}
                                                className="sa-product-thumb-sm"
                                                onError={(e) =>
                                                    (e.target.style.display =
                                                        'none')
                                                }
                                            />
                                        ) : (
                                            <span className="sa-product-thumb-sm-placeholder">
                                                    🍞
                                                </span>
                                        )}
                                    </td>
                                    <td className="sa-cell-name">
                                        {p.name}
                                    </td>
                                    <td>{p.tenantName}</td>
                                    <td className="sa-cell-mono">
                                        {formatPrice(p.price)}
                                    </td>
                                    <td>
                                            <span className="sa-badge sa-badge-orange">
                                                {toPersianNumber(p.soldCount)} عدد
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

export default MonitoringReportsPage;