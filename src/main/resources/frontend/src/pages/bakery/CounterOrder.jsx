// src/pages/bakery/CounterOrder.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';

/* ============================================================
   🎯 کلیدهای localStorage — به‌ازای هر نانوایی (tenantId)
   ============================================================ */
const getTenantId = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.tenantId || user.bakeryId || null;
        }
    } catch (e) {
        console.error('خطا در دریافت tenantId:', e);
    }
    return null;
};

const getCartKey = () => {
    const tid = getTenantId();
    return tid ? `bako_counter_cart_${tid}` : 'bako_counter_cart_guest';
};

function CounterOrder() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState({});

    // 🎯 خواندن سبد از localStorage — کلید per-tenant
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(getCartKey());
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('خطا در بارگذاری سبد:', e);
        }
        return [];
    });

    // 🎯 ذخیره سبد — کلید per-tenant
    useEffect(() => {
        try {
            localStorage.setItem(getCartKey(), JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (e) {
            console.error('خطا در ذخیره سبد:', e);
        }
    }, [cart]);

    // بررسی لاگین
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    // دریافت محصولات
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const res = await getProducts();
                const data = res.data || [];
                setProducts(data);
                setFilteredProducts(data);

                const initialQty = {};
                data.forEach(p => {
                    const id = p.productId || p._id || p.id;
                    if (id) initialQty[id] = 1;
                });
                setQuantities(initialQty);
            } catch (err) {
                console.error('❌ خطا در دریافت محصولات:', err);
                showToast('خطا در دریافت محصولات', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // فیلتر محصولات
    useEffect(() => {
        let result = products;
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter(p => p.name?.toLowerCase().includes(term));
        }
        if (selectedCategory !== 'ALL') {
            result = result.filter(p => p.category === selectedCategory);
        }
        setFilteredProducts(result);
    }, [searchTerm, selectedCategory, products]);

    const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];

    const getProductIdentifier = (product) => product.productId || product._id || product.id;

    const increaseQty = (productId) => {
        setQuantities(prev => ({ ...prev, [productId]: (prev[productId] || 1) + 1 }));
    };

    const decreaseQty = (productId) => {
        setQuantities(prev => {
            const current = prev[productId] || 1;
            if (current <= 1) return prev;
            return { ...prev, [productId]: current - 1 };
        });
    };

    const addToCart = (product) => {
        const productId = getProductIdentifier(product);
        if (!productId) {
            showToast('محصول شناسه ندارد', 'error');
            return;
        }

        const qtyToAdd = quantities[productId] || 1;
        const stock = Number(product.stock) || 0;
        const existingItem = cart.find(item => String(item.productId) === String(productId));
        const currentInCart = existingItem ? existingItem.quantity : 0;

        if (currentInCart + qtyToAdd > stock) {
            showToast(`موجودی کافی نیست (حداکثر ${toPersianNumber(stock)} عدد)`, 'error');
            return;
        }

        const cartItem = {
            productId: String(productId),
            name: product.name || 'نامشخص',
            price: Number(product.price) || 0,
            quantity: qtyToAdd,
            imageUrl: product.imageUrl || '/images/default-bread.png',
        };

        if (existingItem) {
            setCart(cart.map(item =>
                String(item.productId) === String(productId)
                    ? { ...item, quantity: item.quantity + qtyToAdd }
                    : item
            ));
        } else {
            setCart([...cart, cartItem]);
        }

        setQuantities(prev => ({ ...prev, [productId]: 1 }));
        showToast(`${product.name} به سبد اضافه شد`, 'success');
    };

    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری محصولات...</p>
            </div>
        );
    }

    return (
        <div className="counter-order-new">
            {/* ===== نوار جستجو و فیلتر ===== */}
            <div className="filter-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="جستجوی محصول..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="category-filter">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat === 'ALL' ? 'همه' : cat}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}
                    className="filter-btn"
                    style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold-soft)', color: 'var(--primary-dark)', fontWeight: '700' }}
                >
                    🔄 بروزرسانی
                </button>
            </div>

            {/* ===== گرید محصولات ===== */}
            {filteredProducts.length === 0 ? (
                <div className="empty-products">
                    <span className="empty-icon">🍞</span>
                    <p>محصولی با این مشخصات یافت نشد</p>
                </div>
            ) : (
                <div className="product-grid-modern">
                    {filteredProducts.map((product) => {
                        const productId = getProductIdentifier(product);
                        if (!productId) return null;

                        let imageUrl = product.imageUrl;
                        if (imageUrl && !imageUrl.startsWith('/')) imageUrl = '/' + imageUrl;
                        if (!imageUrl) imageUrl = '/images/default-bread.png';

                        const stock = Number(product.stock) || 0;
                        const qty = quantities[productId] || 1;

                        return (
                            <div key={productId} className="product-card-modern">
                                <div className="product-image-wrapper">
                                    <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="product-image"
                                        onError={(e) => e.target.src = '/images/default-bread.png'}
                                    />
                                    {stock < 10 && stock > 0 && (
                                        <span className="stock-badge low">موجودی: {toPersianNumber(stock)}</span>
                                    )}
                                    {stock === 0 && (
                                        <span className="stock-badge out">ناموجود</span>
                                    )}
                                </div>

                                <div className="product-info">
                                    <h3 className="product-name">{product.name || 'نامشخص'}</h3>
                                    <span className="product-category">{product.category || 'متفرقه'}</span>
                                    <div className="product-price-row">
                                        <span className="product-price">{formatPrice(product.price || 0)} ریال</span>
                                    </div>

                                    <div className="counter-qty-controls">
                                        <button
                                            onClick={() => decreaseQty(productId)}
                                            className="qty-btn-small minus"
                                            disabled={qty <= 1}
                                        >
                                            −
                                        </button>
                                        <span className="qty-display">{toPersianNumber(qty)}</span>
                                        <button
                                            onClick={() => increaseQty(productId)}
                                            className="qty-btn-small plus"
                                            disabled={stock <= 0 || qty >= stock}
                                        >
                                            +
                                        </button>
                                    </div>

                                    <button
                                        className={`btn-add-modern ${stock <= 0 ? 'disabled' : ''}`}
                                        onClick={() => addToCart(product)}
                                        disabled={stock <= 0}
                                    >
                                        {stock <= 0 ? 'ناموجود' : '➕ افزودن'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default CounterOrder;