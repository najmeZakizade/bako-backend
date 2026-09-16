// src/pages/customer/HomePage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, addToCart } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';

function HomePage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingId, setAddingId] = useState(null);

    /* ============================================================
       دریافت محصولات
       ============================================================ */
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const res = await getProducts();
                const data = res.data || [];
                setProducts(data);
            } catch (err) {
                console.error('❌ خطا در دریافت محصولات:', err);
                showToast('خطا در دریافت محصولات', 'error');
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    /* ============================================================
       افزودن به سبد خرید
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

        try {
            setAddingId(productId);
            await addToCart(productId, 1);
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
       ویژگی‌های نانوایی
       ============================================================ */
    const features = [
        {
            icon: '/icons/fresh-bread.png',
            emoji: '🍞',
            title: 'نان تازه',
            description: 'پخت روزانه با بهترین کیفیت',
        },
        {
            icon: '/icons/fast-delivery.png',
            emoji: '🚚',
            title: 'ارسال سریع',
            description: 'تحویل در کمترین زمان',
        },
        {
            icon: '/icons/quality.png',
            emoji: '⭐',
            title: 'کیفیت برتر',
            description: 'مواد اولیه درجه یک',
        },
        {
            icon: '/icons/support.png',
            emoji: '📞',
            title: 'پشتیبانی ۲۴/۷',
            description: 'همیشه در کنار شما',
        },
    ];

    /* ============================================================
       فیلتر محصولات موجود
       ============================================================ */
    const availableProducts = products.filter(
        (p) => (p.stock ?? 1) > 0 && p.enabled !== false
    );

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="home-page">

            {/* ===== تصویر هدر ===== */}
            <img
                src="/header-bg.png"
                alt="بیکو"
                className="header-img"
                onError={(e) => {
                    // اگه تصویر نبود، جایگزین ساده
                    e.target.style.display = 'none';
                }}
            />

            {/* ===== بخش محصولات محبوب ===== */}
            <section className="popular">
                <h2>🍞 محصولات محبوب</h2>

                {loading ? (
                    <div className="counter-loading">
                        <div className="spinner"></div>
                        <p>⏳ در حال بارگذاری محصولات...</p>
                    </div>
                ) : availableProducts.length === 0 ? (
                    <div className="empty-products">
                        <span className="empty-icon">🥖</span>
                        <p>هنوز محصولی برای نمایش وجود ندارد</p>
                    </div>
                ) : (
                    <div className="product-grid">
                        {availableProducts.slice(0, 8).map((product) => {
                            const id = product._id || product.id;
                            const inStock = (product.stock ?? 1) > 0;
                            const isAdding = addingId === id;

                            return (
                                <div className="product-card" key={id}>
                                    <img
                                        src={
                                            product.imageUrl ||
                                            '/images/default-bread.png'
                                        }
                                        alt={product.name}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.src =
                                                '/images/default-bread.png';
                                        }}
                                    />

                                    <h3>{product.name}</h3>

                                    <div className="price">
                                        {formatPrice(product.price)} ریال
                                    </div>

                                    {product.category && (
                                        <span className="category-tag">
                                            {product.category}
                                        </span>
                                    )}

                                    <div
                                        className={`stock-info ${
                                            !inStock ? 'out-of-stock' : ''
                                        }`}
                                    >
                                        {inStock
                                            ? `موجودی: ${toPersianNumber(
                                                product.stock ?? '—'
                                            )}`
                                            : 'ناموجود'}
                                    </div>

                                    <button
                                        className="btn-add-to-cart"
                                        onClick={() =>
                                            handleAddToCart(product)
                                        }
                                        disabled={!inStock || isAdding}
                                    >
                                        {isAdding
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

                {/* دکمه مشاهده همه محصولات */}
                {!loading && availableProducts.length > 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Link
                            to="/products"
                            className="btn-back-shop"
                            style={{ display: 'inline-block' }}
                        >
                            مشاهده همه محصولات ←
                        </Link>
                    </div>
                )}
            </section>

            {/* ===== ویژگی‌های نانوایی ===== */}
            <section className="features">
                {features.map((feature, index) => (
                    <div className="feature" key={index}>
                        <img
                            src={feature.icon}
                            alt={feature.title}
                            className="feature-icon"
                            onError={(e) => {
                                // اگه تصویر نبود، ایموجی نشون بده
                                const parent = e.target.parentElement;
                                e.target.style.display = 'none';
                                if (
                                    parent &&
                                    !parent.querySelector('.feature-emoji')
                                ) {
                                    const span =
                                        document.createElement('span');
                                    span.className = 'feature-emoji';
                                    span.style.fontSize = '48px';
                                    span.style.display = 'block';
                                    span.style.marginBottom = '10px';
                                    span.textContent = feature.emoji;
                                    parent.insertBefore(
                                        span,
                                        parent.firstChild
                                    );
                                }
                            }}
                        />
                        <h4>{feature.title}</h4>
                        <p>{feature.description}</p>
                    </div>
                ))}
            </section>

            {/* ===== فوتر ===== */}
            <footer className="footer">
                <div className="footer-content">

                    {/* درباره */}
                    <div className="footer-column-about">
                        <h3>درباره بیکو</h3>
                        <p>
                            بیکو با سال‌ها تجربه در صنعت نانوایی، هر روز نان
                            تازه و باکیفیت را به دست شما می‌رساند. هدف ما
                            ارائه بهترین محصولات با مواد اولیه درجه یک و
                            خدماتی متمایز است.
                        </p>
                    </div>

                    {/* تماس */}
                    <div className="footer-column-contact">
                        <h3>تماس با ما</h3>
                        <div className="contact-item">
                            <span>📍</span>
                            <span>یزد، خیابان امام، پلاک ۱۰</span>
                        </div>
                        <div className="contact-item">
                            <span>📞</span>
                            <span>{toPersianNumber('03512345678')}</span>
                        </div>
                        <div className="contact-item">
                            <span>✉️</span>
                            <span>bako@example.com</span>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    © {toPersianNumber(new Date().getFullYear())} بیکو — تمامی
                    حقوق محفوظ است.
                </div>
            </footer>
        </div>
    );
}

export default HomePage;