// src/pages/bakery/Inventory.jsx
import { useState, useEffect } from 'react';
import { getProducts, updateProduct } from '../../services/api';
import { showToast } from '../../utils/toast';
import { toPersianNumber, formatPrice } from '../../utils/format';

function Inventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tempStock, setTempStock] = useState({});
    const [changedIds, setChangedIds] = useState(new Set());

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await getProducts();
                const data = res.data || [];
                setProducts(data);
                const initialTemp = {};
                data.forEach(p => {
                    const id = p._id || p.id;
                    initialTemp[id] = p.stock || 0;
                });
                setTempStock(initialTemp);
                setLoading(false);
            } catch (err) {
                console.error('خطا در دریافت محصولات:', err);
                setLoading(false);
                showToast('خطا در دریافت محصولات', 'error');
            }
        };
        fetchProducts();
    }, []);

    // 👇 به‌روزرسانی خودکار changedIds بر اساس مقایسه tempStock با مقادیر اصلی
    useEffect(() => {
        const changed = new Set();
        products.forEach(p => {
            const id = p._id || p.id;
            const original = p.stock || 0;
            const temp = tempStock[id];
            if (temp !== undefined && temp !== original) {
                changed.add(id);
            }
        });
        setChangedIds(changed);
    }, [tempStock, products]);

    const getProductId = (product) => product._id || product.id;

    // 👇 آیا اصلاً تغییری هست؟ اگه نه، کل ستون عملیات مخفی می‌شه
    const hasAnyChanges = changedIds.size > 0;

    const increaseStock = (id) => {
        setTempStock(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
    };

    const decreaseStock = (id) => {
        setTempStock(prev => {
            const current = prev[id] || 0;
            if (current <= 0) return prev;
            return {
                ...prev,
                [id]: current - 1
            };
        });
    };

    const handleStockUpdate = async (id) => {
        try {
            const product = products.find(p => getProductId(p) === id);
            if (!product) {
                showToast('محصول یافت نشد', 'error');
                return;
            }

            const newStockValue = tempStock[id] || 0;

            const updatedProduct = {
                ...product,
                stock: newStockValue
            };

            await updateProduct(id, updatedProduct);

            setProducts(prev =>
                prev.map(p =>
                    getProductId(p) === id ? { ...p, stock: newStockValue } : p
                )
            );

            showToast('موجودی با موفقیت به‌روز شد', 'success');
        } catch (err) {
            console.error('خطا در به‌روزرسانی موجودی:', err);
            showToast('خطا در به‌روزرسانی موجودی', 'error');
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ در حال بارگذاری...</div>;
    }

    return (
        <div className="inventory">
            {products.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '30px', color: '#6b3f2b', opacity: 0.7 }}>
                    هیچ محصولی ثبت نشده است.
                </p>
            ) : (
                <div className="table-wrapper">
                    <table className="order-table">
                        <thead>
                        <tr>
                            <th>تصویر</th>
                            <th>نام محصول</th>
                            <th>قیمت (ریال)</th>
                            <th style={{ minWidth: '130px' }}>موجودی فعلی</th>
                            {/* 👇 ستون عملیات فقط وقتی تغییری هست نمایش داده می‌شه */}
                            {hasAnyChanges && <th style={{ width: '60px' }}>عملیات</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {products.map((product) => {
                            const id = getProductId(product);
                            const currentStock = tempStock[id] !== undefined ? tempStock[id] : (product.stock || 0);
                            const hasChanged = changedIds.has(id);

                            return (
                                <tr key={id}>
                                    <td>
                                        <img
                                            src={product.imageUrl || '/images/default-bread.png'}
                                            alt={product.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '2px solid #f0ebe7',
                                                display: 'block',
                                                margin: '0 auto'
                                            }}
                                        />
                                    </td>
                                    <td><strong>{product.name}</strong></td>
                                    <td>{formatPrice(product.price || 0)}</td>
                                    <td>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}>
                                            <button
                                                onClick={() => decreaseStock(id)}
                                                style={{
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: '6px',
                                                    border: '1.5px solid var(--red)',
                                                    background: 'transparent',
                                                    color: 'var(--red)',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease',
                                                    lineHeight: 1,
                                                    padding: 0
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = 'var(--red)';
                                                    e.target.style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'transparent';
                                                    e.target.style.color = 'var(--red)';
                                                }}
                                                disabled={currentStock <= 0}
                                            >
                                                −
                                            </button>

                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                minWidth: '28px',
                                                padding: '3px 8px',
                                                textAlign: 'center',
                                                color: currentStock < 10 ? 'var(--red)' : 'var(--green-dark)',
                                                background: currentStock < 10
                                                    ? 'rgba(192, 57, 43, 0.08)'
                                                    : 'rgba(45, 106, 79, 0.08)',
                                                borderRadius: '6px',
                                                lineHeight: 1.2,
                                                display: 'inline-block'
                                            }}>
                                                {toPersianNumber(currentStock)}
                                            </span>

                                            <button
                                                onClick={() => increaseStock(id)}
                                                style={{
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: '6px',
                                                    border: '1.5px solid var(--green)',
                                                    background: 'transparent',
                                                    color: 'var(--green)',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease',
                                                    lineHeight: 1,
                                                    padding: 0
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = 'var(--green)';
                                                    e.target.style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'transparent';
                                                    e.target.style.color = 'var(--green)';
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    {/* 👇 سلول عملیات هم فقط وقتی ستونش هست رندر می‌شه */}
                                    {hasAnyChanges && (
                                        <td>
                                            {hasChanged ? (
                                                <button
                                                    onClick={() => handleStockUpdate(id)}
                                                    style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '50%',
                                                        border: 'none',
                                                        background: 'var(--gold-soft)',
                                                        color: 'var(--primary-dark)',
                                                        fontSize: '16px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 2px 8px rgba(212, 163, 115, 0.25)',
                                                        padding: 0
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = '#c49a6e';
                                                        e.target.style.transform = 'scale(1.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'var(--gold-soft)';
                                                        e.target.style.transform = 'scale(1)';
                                                    }}
                                                    title="ذخیره تغییرات"
                                                >
                                                    💾
                                                </button>
                                            ) : (
                                                <span style={{
                                                    fontSize: '14px',
                                                    color: '#ccc',
                                                    fontWeight: '400'
                                                }}>
                                                    –
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Inventory;