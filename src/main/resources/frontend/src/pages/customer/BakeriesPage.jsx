// src/pages/customer/BakeriesPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBakeries, getProducts } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import '../../styles/bakeries-page.css';

/* ============================================================
   حداکثر تعداد نام محصول برای نمایش
   ============================================================ */
const MAX_PRODUCT_NAMES = 5;

function BakeriesPage() {
    const navigate = useNavigate();
    const [bakeries, setBakeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    /* ============================================================
       دریافت نانوایی‌ها + محصولات هر کدام
       ============================================================ */
    useEffect(() => {
        const fetchBakeries = async () => {
            try {
                setLoading(true);
                const res = await getBakeries();
                const data = res.data || [];
                const activeBakeries = data.filter(
                    (b) => b.enabled !== false && b.status !== 'INACTIVE'
                );

                // 🎯 دریافت محصولات هر نانوایی به‌صورت موازی
                const bakeriesWithProducts = await Promise.all(
                    activeBakeries.map(async (bakery) => {
                        const id = bakery._id || bakery.id;
                        if (!id) return { ...bakery, products: [] };

                        try {
                            const productsRes = await getProducts({
                                tenantId: id,
                                enabled: true,
                            });
                            const products = productsRes.data || [];

                            // فقط اسم‌های غیرخالی و یکتا
                            const productNames = [
                                ...new Set(
                                    products
                                        .map((p) => (p.name || '').trim())
                                        .filter((n) => n.length > 0)
                                ),
                            ];

                            return {
                                ...bakery,
                                products: productNames,
                                productCount: productNames.length,
                            };
                        } catch (err) {
                            console.warn(
                                `⚠️ خطا در دریافت محصولات نانوایی ${id}:`,
                                err.message
                            );
                            return { ...bakery, products: [] };
                        }
                    })
                );

                setBakeries(bakeriesWithProducts);
            } catch (err) {
                console.error('❌ خطا در دریافت نانوایی‌ها:', err);
                showToast('خطا در دریافت لیست نانوایی‌ها', 'error');
                setBakeries([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBakeries();
    }, []);

    /* ============================================================
       فیلتر جستجو — روی نام نانوایی، آدرس و نام محصولات
       ============================================================ */
    const filteredBakeries = bakeries.filter((bakery) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;

        const name = (bakery.name || '').toLowerCase();
        const address = (bakery.address || '').toLowerCase();
        const productsMatch = (bakery.products || []).some((p) =>
            p.toLowerCase().includes(term)
        );

        return name.includes(term) || address.includes(term) || productsMatch;
    });

    /* ============================================================
       انتخاب نانوایی
       ============================================================ */
    const handleSelectBakery = (bakery) => {
        const id = bakery._id || bakery.id;
        if (!id) return;

        localStorage.setItem('bako_selected_bakery', JSON.stringify(bakery));
        showToast(`ورود به ${bakery.name || 'نانوایی'}`, 'success');
        setTimeout(() => navigate(`/bakeries/${id}`), 300);
    };

    /* ============================================================
       بررسی وضعیت باز/بسته
       ============================================================ */
    const isOpen = (bakery) => {
        if (bakery.isOpen !== undefined) return bakery.isOpen;
        if (bakery.status === 'OPEN') return true;
        if (bakery.status === 'CLOSED') return false;
        return true;
    };

    /* ============================================================
       🎯 متن محصولات — با کاما جدا می‌شود
       اگه بیشتر از MAX_PRODUCT_NAMES بود، بقیه رو با شماره نشون بده
       ============================================================ */
    const getProductsText = (products) => {
        if (!products || products.length === 0) return null;

        if (products.length <= MAX_PRODUCT_NAMES) {
            return products.join('، ');
        }

        const shown = products.slice(0, MAX_PRODUCT_NAMES).join('، ');
        const remaining = products.length - MAX_PRODUCT_NAMES;
        return `${shown} و ${toPersianNumber(remaining)} محصول دیگر`;
    };

    /* ============================================================
       رندر — بارگذاری
       ============================================================ */
    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری نانوایی‌ها...</p>
            </div>
        );
    }

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="bakeries-page">

            {/* ===== عنوان صفحه ===== */}
            <PageTitle
                image="/sidebar-icons/home.png"
                fallbackIcon="🏪"
                title="لیست نانوایی‌های موجود"
            />

            {/* ===== نوار جستجو ===== */}
            <div className="bakeries-search-wrapper">
                <div className="bakeries-search">
                    <span className="bakeries-search-icon">🔍</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="جستجوی نانوایی یا محصول..."
                        className="bakeries-search-input"
                    />
                    {searchTerm && (
                        <button
                            className="bakeries-search-clear"
                            onClick={() => setSearchTerm('')}
                            type="button"
                            aria-label="پاک کردن"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* ===== لیست نانوایی‌ها ===== */}
            {filteredBakeries.length === 0 ? (
                <div className="empty-cart">
                    <span
                        style={{
                            fontSize: '56px',
                            display: 'block',
                            marginBottom: '12px',
                        }}
                    >
                        🏪
                    </span>
                    <h2>
                        {searchTerm
                            ? 'نانوایی‌ای با این مشخصات یافت نشد'
                            : 'هنوز نانوایی‌ای ثبت نشده است'}
                    </h2>
                    <p>
                        {searchTerm
                            ? 'جستجوی خود را تغییر دهید یا همه نانوایی‌ها را ببینید.'
                            : 'به‌زودی نانوایی‌های بیشتری اضافه می‌شوند.'}
                    </p>
                    {searchTerm && (
                        <button
                            className="btn-back-shop"
                            onClick={() => setSearchTerm('')}
                        >
                            نمایش همه نانوایی‌ها
                        </button>
                    )}
                </div>
            ) : (
                <div className="bakeries-grid">
                    {filteredBakeries.map((bakery) => {
                        const id = bakery._id || bakery.id;
                        const bakeryOpen = isOpen(bakery);
                        const productsText = getProductsText(bakery.products);

                        return (
                            <button
                                key={id}
                                type="button"
                                className={`bakery-card ${
                                    !bakeryOpen ? 'closed' : ''
                                }`}
                                onClick={() =>
                                    bakeryOpen && handleSelectBakery(bakery)
                                }
                                disabled={!bakeryOpen}
                            >
                                {/* تصویر */}
                                <div className="bakery-card-image-wrap">
                                    <img
                                        src={
                                            bakery.coverImageUrl ||
                                            bakery.logoUrl ||
                                            '/images/default-bakery.png'
                                        }
                                        alt={bakery.name}
                                        className="bakery-card-image"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display =
                                                'flex';
                                        }}
                                    />
                                    <div
                                        className="bakery-card-image-fallback"
                                        style={{ display: 'none' }}
                                    >
                                        🏪
                                    </div>

                                    {/* نشان باز/بسته */}
                                    <span
                                        className={`bakery-status-badge ${
                                            bakeryOpen ? 'open' : 'closed'
                                        }`}
                                    >
                                        <span className="bakery-status-dot"></span>
                                        <span className="bakery-status-text">
                                            {bakeryOpen ? 'باز' : 'بسته'}
                                        </span>
                                    </span>
                                </div>

                                {/* اطلاعات */}
                                <div className="bakery-card-body">
                                    <h3 className="bakery-card-name">
                                        {bakery.name || 'نانوایی'}
                                    </h3>

                                    {bakery.address && (
                                        <p className="bakery-card-address">
                                            <span>📍</span>
                                            <span>{bakery.address}</span>
                                        </p>
                                    )}

                                    {bakery.phone && (
                                        <p className="bakery-card-phone">
                                            <span>📞</span>
                                            <span>
                                                {toPersianNumber(bakery.phone)}
                                            </span>
                                        </p>
                                    )}

                                    {/* 🆕 خط محصولات */}
                                    {productsText && (
                                        <p
                                            className="bakery-card-products-list"
                                            title={bakery.products.join('، ')}
                                        >
                                            <span className="products-list-icon">
                                                🍞
                                            </span>
                                            <span className="products-list-text">
                                                {productsText}
                                            </span>
                                        </p>
                                    )}

                                    <div className="bakery-card-footer">
                                        {bakery.rating > 0 && (
                                            <span className="bakery-card-rating">
                                                ⭐{' '}
                                                {toPersianNumber(
                                                    bakery.rating.toFixed(1)
                                                )}
                                            </span>
                                        )}
                                        {bakery.productCount > 0 && (
                                            <span className="bakery-card-products">
                                                🍞{' '}
                                                {toPersianNumber(
                                                    bakery.productCount
                                                )}{' '}
                                                محصول
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="bakery-card-action">
                                    {bakeryOpen
                                        ? 'مشاهده محصولات ←'
                                        : 'در حال حاضر بسته است'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default BakeriesPage;