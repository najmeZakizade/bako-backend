// src/pages/customer/CartPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getCartItems,
    updateCartItem,
    removeFromCart,
    clearCart,
} from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';
import PageTitle from '../../components/common/PageTitle';
import { refreshCartCount } from '../../utils/cartStore';
import '../../styles/customer-cart.css';

function CartPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState(0);

    /* ============================================================
       دریافت سبد خرید
       ============================================================ */
    const fetchCart = async () => {
        try {
            setLoading(true);
            const response = await getCartItems();
            const data = response.data || [];
            setItems(data);
            calculateTotals(data);

            // 🎯 اطلاع به Store مرکزی
            await refreshCartCount();
        } catch (err) {
            console.error('خطا در دریافت سبد خرید:', err);
            showToast('خطا در دریافت سبد خرید', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (cartItems) => {
        let total = 0;
        cartItems.forEach((item) => {
            const price = item.product?.price || 0;
            total += price * (item.quantity || 0);
        });
        setTotalPrice(total);
    };

    /* ============================================================
       تغییر تعداد — با delta
       ============================================================ */
    const handleUpdateQuantity = async (productId, delta) => {
        try {
            await updateCartItem(productId, delta, true);
            await fetchCart();
        } catch (err) {
            console.error('خطا در تغییر تعداد:', err);
            const msg =
                err.response?.data?.message ||
                'خطا در تغییر تعداد محصول';
            showToast(msg, 'error');
        }
    };

    /* ============================================================
       حذف یک محصول
       ============================================================ */
    const handleRemove = async (productId) => {
        if (!window.confirm('آیا از حذف این محصول از سبد خرید اطمینان دارید؟'))
            return;
        try {
            await removeFromCart(productId);
            await fetchCart();
            showToast('محصول از سبد حذف شد', 'success');
        } catch (err) {
            console.error('خطا در حذف محصول:', err);
            showToast('خطا در حذف محصول از سبد خرید', 'error');
        }
    };

    /* ============================================================
       خالی کردن سبد
       ============================================================ */
    const handleClear = async () => {
        if (!window.confirm('آیا از خالی کردن کامل سبد خرید اطمینان دارید؟'))
            return;
        try {
            await clearCart();
            await fetchCart();
            showToast('سبد خرید خالی شد', 'success');
        } catch (err) {
            console.error('خطا در خالی کردن سبد:', err);
            showToast('خطا در خالی کردن سبد خرید', 'error');
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    /* ============================================================
       رندر — حالت بارگذاری
       ============================================================ */
    if (loading) {
        return (
            <div className="counter-loading">
                <div className="spinner"></div>
                <p>⏳ در حال بارگذاری سبد خرید...</p>
            </div>
        );
    }

    /* ============================================================
       رندر — سبد خالی
       ============================================================ */
    if (items.length === 0) {
        return (
            <div className="empty-cart">
                <span
                    style={{
                        fontSize: '56px',
                        display: 'block',
                        marginBottom: '12px',
                    }}
                >
                    🛒
                </span>
                <h2>سبد خرید خالی است</h2>
                <p>هنوز محصولی به سبد خرید اضافه نکرده‌اید.</p>
                <button
                    className="btn-back-shop"
                    onClick={() => navigate('/')}
                >
                    🍞 مشاهده نانوایی‌ها
                </button>
            </div>
        );
    }

    /* ============================================================
       رندر اصلی
       ============================================================ */
    return (
        <div className="cart-page-container">

            {/* ===== عنوان صفحه ===== */}
            <PageTitle
                image="/sidebar-icons/cart.png"
                fallbackIcon="🛒"
                title="سبد خرید"
                count={`${toPersianNumber(items.length)} آیتم`}
            />

            {/* ===== نوار ابزار بالای جدول ===== */}
            <div className="cart-toolbar">
                <button
                    onClick={handleClear}
                    className="btn-clear-cart-top"
                    type="button"
                    title="خالی کردن سبد خرید"
                >
                    <span className="cart-trash-icon" aria-hidden="true"></span>
                    خالی کردن سبد
                </button>
            </div>

            {/* ===== جدول ===== */}
            <div className="table-wrapper">
                <table className="cart-table">
                    <thead>
                    <tr>
                        <th>نام محصول</th>
                        <th>نانوایی</th>
                        <th>قیمت واحد</th>
                        <th>تعداد</th>
                        <th>جمع</th>
                        <th>عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((item) => {
                        const productId =
                            item.product?._id ||
                            item.product?.id ||
                            item.productId;

                        const price = item.product?.price || 0;
                        const quantity = item.quantity || 0;
                        const tenantId = item.tenantId;

                        return (
                            <tr key={productId}>
                                <td style={{ fontWeight: 'bold' }}>
                                    {item.product?.name || '—'}
                                </td>

                                <td>
                                    {tenantId ? (
                                        <Link
                                            to={`/bakeries/${tenantId}`}
                                            className="cart-tenant-name"
                                            title="مشاهده نانوایی"
                                        >
                                            🏪 {item.tenantName || 'نانوایی'}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </td>

                                <td>{formatPrice(price)} ریال</td>

                                <td>
                                    <div className="cart-qty-wrapper">
                                        <button
                                            onClick={() =>
                                                handleUpdateQuantity(
                                                    productId,
                                                    -1
                                                )
                                            }
                                            disabled={quantity <= 1}
                                            className="cart-qty-icon-btn minus"
                                            type="button"
                                            aria-label="کاهش تعداد"
                                        >
                                            −
                                        </button>
                                        <span className="cart-qty-num">
                                                {toPersianNumber(quantity)}
                                            </span>
                                        <button
                                            onClick={() =>
                                                handleUpdateQuantity(
                                                    productId,
                                                    1
                                                )
                                            }
                                            className="cart-qty-icon-btn plus"
                                            type="button"
                                            aria-label="افزایش تعداد"
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>

                                <td style={{ fontWeight: 'bold' }}>
                                    {formatPrice(price * quantity)} ریال
                                </td>

                                <td>
                                    <button
                                        onClick={() =>
                                            handleRemove(productId)
                                        }
                                        className="cart-delete-btn"
                                        type="button"
                                        title="حذف از سبد"
                                        aria-label="حذف از سبد"
                                    >
                                        <span
                                            className="cart-trash-icon"
                                            aria-hidden="true"
                                        ></span>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* ===== جمع‌بندی ===== */}
            <div className="cart-summary">
                <div className="total">
                    مجموع:{' '}
                    <span>{formatPrice(totalPrice)} ریال</span>
                </div>
                <div className="cart-actions-row">
                    {/* 🎯 تغییر: به جای /checkout → /delivery */}
                    <Link to="/delivery" className="btn-checkout-square">
                        ادامه فرآیند خرید
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default CartPage;