// src/pages/customer/BakeryDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getBakery,
    getProducts,
    addToCart,
    getCartItems,
    clearCart,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import ConfirmModal from '../../components/common/ConfirmModal';
import '../../styles/bakery-detail.css';

function BakeryDetailPage() {
    const { id: bakeryId } = useParams();
    const navigate = useNavigate();

    const [bakery, setBakery] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [addingId, setAddingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    /* ============================================================
       🎯 State — مودال تداخل نانوایی
       ============================================================ */
    const [conflictModal, setConflictModal] = useState({
        show: false,
        pendingProduct: null,
        existingTenantName: '',
        newTenantName: '',
    });
    const [clearingCart, setClearingCart] = useState(false);

    /* ============================================================
       دریافت اطلاعات نانوایی + محصولات
       ============================================================ */
    useEffect(() => {
        if (!bakeryId) {
            navigate('/');
            return;
        }

        const fetchBakeryData = async () => {
            try {
                setLoading(true);

                const bakeryRes = await getBakery(bakeryId);
                setBakery(bakeryRes.data || null);

                setProductsLoading(true);
                const productsRes = await getProducts({
                    tenantId: bakeryId,
                });

                const list = productsRes.data || [];
                const enabledProducts = list.filter(
                    (p) => p.enabled !== false
                );

                setProducts(enabledProducts);
            } catch (err) {
                console.error('❌ خطا در دریافت اطلاعات:', err);
                const msg =
                    err.response?.data?.message ||
                    'خطا در دریافت اطلاعات نانوایی';
                showToast(msg, 'error');
                setBakery(null);
                setProducts([]);
            } finally {
                setLoading(false);
                setProductsLoading(false);
            }
        };

        fetchBakeryData();
    }, [bakeryId, navigate]);

    /* ============================================================
       🎯 چک tenant سبد فعلی
       ============================================================ */
    const getCurrentCartTenantId = async () => {
        try {
            const res = await getCartItems();
            const items = res.data || [];
            if (items.length === 0) return null;
            return items[0].tenantId || null;
        } catch (err) {
            console.warn('⚠️ خطا در خواندن سبد:', err);
            return null;
        }
    };

    /* ============================================================
       🎯 افزودن واقعی به سبد (بعد از تأیید کاربر)
       ============================================================ */
    const doAddToCart = async (product) => {
        const productId = product._id || product.id;

        try {
            setAddingId(productId);
            await addToCart(productId, 1, bakeryId);
            showToast(`«${product.name}» به سبد اضافه شد`, 'success');
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error('❌ خطا در افزودن به سبد:', err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                'خطا در افزودن به سبد خرید';
            showToast(msg, 'error');
        } finally {
            setAddingId(null);
        }
    };

    /* ============================================================
       🎯 افزودن به سبد — با چک تداخل نانوایی
       ============================================================ */
    const handleAddToCart = async (product) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('برای افزودن به سبد ابتدا وارد شوید', 'error');
            setTimeout(() => navigate('/login'), 800);
            return;
        }

        const productId = product._id || product.id;
        if (!productId) {
            showToast('شناسه محصول نامعتبر است', 'error');
            return;
        }

        if (!bakeryId) {
            showToast('شناسه نانوایی نامعتبر است', 'error');
            return;
        }

        // 🎯 چک tenant سبد فعلی
        const cartTenantId = await getCurrentCartTenantId();

        // اگه سبد خالیه یا از همون نانواییه → مستقیم اضافه کن
        if (!cartTenantId || cartTenantId === bakeryId) {
            await doAddToCart(product);
            return;
        }

        // 🎯 سبد از نانوایی دیگه‌ایه → مودال تأیید باز کن
        let existingTenantName = 'نانوایی دیگری';
        try {
            const existingRes = await getBakery(cartTenantId);
            existingTenantName =
                existingRes?.data?.displayName ||
                existingRes?.data?.name ||
                'نانوایی دیگری';
        } catch {
            // اگه اسم پیدا نشد، از fallback استفاده کن
        }

        const newTenantName =
            bakery?.displayName || bakery?.name || 'این نانوایی';

        setConflictModal({
            show: true,
            pendingProduct: product,
            existingTenantName,
            newTenantName,
        });
    };

    /* ============================================================
       🎯 تأیید خالی کردن سبد و افزودن محصول جدید
       ============================================================ */
    const handleConfirmClearAndAdd = async () => {
        const product = conflictModal.pendingProduct;
        if (!product) return;

        setClearingCart(true);
        try {
            // ۱. خالی کردن سبد فعلی
            await clearCart();
            window.dispatchEvent(new Event('cartUpdated'));

            // ۲. بستن مودال
            setConflictModal({
                show: false,
                pendingProduct: null,
                existingTenantName: '',
                newTenantName: '',
            });

            // ۳. صبر کوتاه برای refresh API
            await new Promise((resolve) => setTimeout(resolve, 200));

            // ۴. افزودن محصول جدید
            await doAddToCart(product);

            showToast('سبد قبلی پاک شد و محصول جدید اضافه شد', 'success');
        } catch (err) {
            console.error('❌ خطا در خالی کردن سبد:', err);
            showToast('خطا در خالی کردن سبد', 'error');
        } finally {
            setClearingCart(false);
        }
    };

    /* ============================================================
       🎯 انصراف از تغییر نانوایی
       ============================================================ */
    const handleCancelConflict = () => {
        setConflictModal({
            show: false,
            pendingProduct: null,
            existingTenantName: '',
            newTenantName: '',
        });
    };

    /* ============================================================
       تصویر محصول
       ============================================================ */
    const getImageUrl = (imagePath) => {
        if (!imagePath) return '/images/default-bread.png';
        return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    };

    /* ============================================================
       فیلترها
       ============================================================ */
    const categories = [
        'ALL',
        ...new Set(products.map((p) => p.category).filter(Boolean)),
    ];

    const filteredProducts = products.filter((product) => {
        const matchSearch = searchTerm
            ? (product.name || '')
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase())
            : true;

        const matchCategory =
            selectedCategory === 'ALL' ||
            product.category === selectedCategory;

        return matchSearch && matchCategory;
    });

    const isBakeryOpen = () => {
        if (!bakery) return true;
        if (bakery.isOpen !== undefined) return bakery.isOpen;
        if (bakery.status === 'OPEN') return true;
        if (bakery.status === 'CLOSED') return false;
        return true;
    };

    /* ============================================================
       رندر
       ============================================================ */
    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری...</p>
            </div>
        );
    }

    if (!bakery) {
        return (
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
                <h2>نانوایی یافت نشد</h2>
                <p>ممکن است حذف شده باشد یا آدرس اشتباه باشد.</p>
                <button
                    className="btn-back-shop"
                    onClick={() => navigate('/')}
                >
                    بازگشت به لیست نانوایی‌ها
                </button>
            </div>
        );
    }

    const bakeryOpen = isBakeryOpen();

    return (
        <div className="bakery-detail-page">

            {/* ===== عنوان صفحه ===== */}
            <PageTitle
                image="/sidebar-icons/home.png"
                fallbackIcon="🏪"
                title={bakery.name || 'نانوایی'}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="جستجوی محصول..."
                rightContent={
                    <button
                        className="bakery-back-btn"
                        onClick={() => navigate('/')}
                        type="button"
                    >
                        بازگشت
                    </button>
                }
            />

            {/* ============================================================
                کادر اطلاعات نانوایی
                ============================================================ */}
            <div className="bakery-info-bar">

                <div className="bakery-info-image">
                    <img
                        src={
                            bakery.coverImageUrl ||
                            bakery.logoUrl ||
                            '/images/default-bakery.png'
                        }
                        alt={bakery.name}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <span
                        className="bakery-info-image-fallback"
                        style={{ display: 'none' }}
                    >
                        🏪
                    </span>
                </div>

                <div className="bakery-info-content">

                    <div className="bakery-info-header">
                        <h2 className="bakery-info-name">
                            {bakery.name}
                        </h2>
                        <span
                            className={`bakery-info-status ${
                                bakeryOpen ? 'open' : 'closed'
                            }`}
                        >
                            <span className="bakery-info-dot"></span>
                            {bakeryOpen ? 'باز' : 'بسته'}
                        </span>
                    </div>

                    <div className="bakery-info-stats">
                        <span className="info-stat">
                            <span className="info-stat-icon">🍞</span>
                            <span className="info-stat-value">
                                {toPersianNumber(products.length)}
                            </span>
                            <span className="info-stat-label">محصول</span>
                        </span>

                        {bakery.rating > 0 && (
                            <span className="info-stat">
                                <span className="info-stat-icon">⭐</span>
                                <span className="info-stat-value">
                                    {toPersianNumber(
                                        bakery.rating.toFixed(1)
                                    )}
                                </span>
                                <span className="info-stat-label">
                                    امتیاز
                                </span>
                            </span>
                        )}

                        {bakery.totalOrders > 0 && (
                            <span className="info-stat">
                                <span className="info-stat-icon">📦</span>
                                <span className="info-stat-value">
                                    {toPersianNumber(bakery.totalOrders)}
                                </span>
                                <span className="info-stat-label">
                                    سفارش
                                </span>
                            </span>
                        )}
                    </div>

                    <div className="bakery-info-details">
                        {bakery.address && (
                            <div className="info-detail-item">
                                <span className="info-detail-icon">📍</span>
                                <span className="info-detail-value">
                                    {bakery.address}
                                </span>
                            </div>
                        )}

                        {bakery.phone && (
                            <div className="info-detail-item">
                                <span className="info-detail-icon">📞</span>
                                <a
                                    href={`tel:${bakery.phone}`}
                                    className="info-detail-value info-detail-link"
                                >
                                    {toPersianNumber(bakery.phone)}
                                </a>
                            </div>
                        )}

                        {bakery.openTime && bakery.closeTime && (
                            <div className="info-detail-item">
                                <span className="info-detail-icon">⏰</span>
                                <span className="info-detail-value">
                                    {bakery.openTime} تا {bakery.closeTime}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================
                بخش محصولات
                ============================================================ */}

            {categories.length > 1 && (
                <div className="bakery-detail-categories">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            className={`bakery-category-btn ${
                                selectedCategory === cat ? 'active' : ''
                            }`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat === 'ALL' ? 'همه' : cat}
                        </button>
                    ))}
                </div>
            )}

            {productsLoading ? (
                <div className="counter-loading">
                    <div className="spinner"></div>
                    <p>⏳ در حال بارگذاری محصولات...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="empty-cart">
                    <span
                        style={{
                            fontSize: '48px',
                            display: 'block',
                            marginBottom: '10px',
                        }}
                    >
                        🥖
                    </span>
                    <h2>
                        {searchTerm
                            ? 'محصولی با این مشخصات یافت نشد'
                            : 'این نانوایی هنوز محصولی اضافه نکرده'}
                    </h2>
                    {searchTerm && (
                        <button
                            className="btn-back-shop"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('ALL');
                            }}
                        >
                            نمایش همه محصولات
                        </button>
                    )}
                </div>
            ) : (
                <div className="product-grid">
                    {filteredProducts.map((product) => {
                        const pid = product._id || product.id;
                        const inStock = (product.stock ?? 1) > 0;
                        const isAdding = addingId === pid;

                        return (
                            <div className="product-card" key={pid}>
                                <img
                                    src={getImageUrl(product.imageUrl)}
                                    alt={product.name}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.src =
                                            '/images/default-bread.png';
                                    }}
                                />

                                <h3>{product.name}</h3>

                                {product.category && (
                                    <span className="category-tag">
                                        {product.category}
                                    </span>
                                )}

                                <div className="price">
                                    {formatPrice(product.price)} ریال
                                </div>

                                <div
                                    className={`stock-info ${
                                        !inStock ? 'out-of-stock' : ''
                                    }`}
                                >
                                    {inStock
                                        ? `✅ موجودی: ${toPersianNumber(
                                            product.stock ?? '—'
                                        )}`
                                        : '❌ ناموجود'}
                                </div>

                                <button
                                    onClick={() =>
                                        handleAddToCart(product)
                                    }
                                    disabled={
                                        !inStock ||
                                        isAdding ||
                                        !bakeryOpen
                                    }
                                    className="btn-add-to-cart-themed"
                                >
                                    {!bakeryOpen
                                        ? '⛔ نانوایی بسته است'
                                        : isAdding
                                            ? '⏳ در حال افزودن...'
                                            : !inStock
                                                ? 'ناموجود'
                                                : '🛒 افزودن به سبد'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ============================================================
                🎯 مودال تداخل نانوایی
                ============================================================ */}
            <ConfirmModal
                show={conflictModal.show}
                icon="⚠️"
                variant="warning"
                title="تداخل با سبد خرید فعلی"
                message={
                    <span>
                        سبد خرید شما از{' '}
                        <strong
                            style={{
                                color: '#c0392b',
                                fontWeight: 900,
                            }}
                        >
                            «{conflictModal.existingTenantName}»
                        </strong>{' '}
                        محصول دارد.
                        <br />
                        برای خرید از{' '}
                        <strong
                            style={{
                                color: '#2d6a4f',
                                fontWeight: 900,
                            }}
                        >
                            «{conflictModal.newTenantName}»
                        </strong>
                        ، ابتدا باید سبد فعلی خالی شود.
                        <br />
                        <span
                            style={{
                                display: 'inline-block',
                                marginTop: '8px',
                                fontSize: '11.5px',
                                color: '#6b3f2b',
                            }}
                        >
                            آیا می‌خواهید سبد قبلی را خالی کنید و
                            این محصول را اضافه کنید؟
                        </span>
                    </span>
                }
                confirmText="🗑 خالی کن و ادامه"
                cancelText="انصراف"
                onConfirm={handleConfirmClearAndAdd}
                onCancel={handleCancelConflict}
                loading={clearingCart}
            />
        </div>
    );
}

export default BakeryDetailPage;