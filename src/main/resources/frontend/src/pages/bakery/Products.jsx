// src/pages/bakery/Products.jsx
import { useState, useEffect, useRef } from 'react';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
} from '../../services/api';
import { toPersianNumber, formatPrice, toEnglishNumber } from '../../utils/format';

const DEFAULT_IMAGE = '/images/default-bread.png';

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'سنتی',
        stock: 1,
        imageUrl: '',
        tenantId: 'BAKERY_1',
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const fileInputRef = useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'success' });
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await getProducts();
            setProducts(res.data || []);
            setLoading(false);
        } catch (err) {
            console.error('خطا در دریافت محصولات:', err);
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const normalized = (name === 'price' || name === 'stock')
            ? toEnglishNumber(value)
            : value;
        setFormData(prev => ({ ...prev, [name]: normalized }));
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('حجم فایل نباید بیشتر از ۵ مگابایت باشد.', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast('فقط فایل تصویری مجاز است.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => setPreviewUrl(ev.target.result);
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            const res = await uploadProductImage(file);
            const url = res.data?.imageUrl;
            if (url) {
                setFormData(prev => ({ ...prev, imageUrl: url }));
                showToast('✅ تصویر با موفقیت آپلود شد.', 'success');
            }
        } catch (err) {
            console.error('خطا در آپلود تصویر:', err);
            const msg = err.response?.data?.error || 'خطا در آپلود تصویر';
            showToast(msg, 'error');
            setPreviewUrl('');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imageUrl: '' }));
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const resetForm = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            price: '',
            category: 'سنتی',
            stock: 1,
            imageUrl: '',
            tenantId: 'BAKERY_1',
        });
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            showToast('لطفاً نام محصول را وارد کنید.', 'error');
            return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            showToast('لطفاً قیمت معتبر وارد کنید.', 'error');
            return;
        }

        setSubmitLoading(true);
        try {
            let imageUrl = formData.imageUrl;
            if (!imageUrl && editingProduct?.imageUrl) {
                imageUrl = editingProduct.imageUrl;
            }
            if (!imageUrl) {
                imageUrl = DEFAULT_IMAGE;
            }

            const payload = {
                name: formData.name.trim(),
                price: parseFloat(formData.price) || 0,
                category: formData.category || 'سنتی',
                stock: parseInt(formData.stock) || 1,
                tenantId: formData.tenantId || 'BAKERY_1',
                imageUrl,
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, payload);
                setProducts(prev => prev.map(p =>
                    p.id === editingProduct.id ? { ...p, ...payload } : p
                ));
                showToast('محصول با موفقیت ویرایش شد!', 'success');
            } else {
                const res = await createProduct(payload);
                setProducts(prev => [...prev, res.data]);
                showToast('محصول با موفقیت اضافه شد!', 'success');
            }

            resetForm();
            await fetchProducts();
        } catch (err) {
            console.error('خطا در ذخیره محصول:', err);
            showToast('خطا در ذخیره اطلاعات. لطفاً دوباره تلاش کنید.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            price: product.price || '',
            category: product.category || 'سنتی',
            stock: product.stock || 1,
            imageUrl: product.imageUrl || '',
            tenantId: product.tenantId || 'BAKERY_1',
        });
        setPreviewUrl(product.imageUrl || '');
        setShowForm(true);
        setTimeout(() => {
            document.querySelector('.product-form')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) {
            try {
                await deleteProduct(id);
                setProducts(prev => prev.filter(p => p.id !== id));
                showToast(`محصول "${name}" با موفقیت حذف شد!`, 'success');
            } catch (err) {
                console.error('خطا در حذف محصول:', err);
                showToast('خطا در حذف محصول', 'error');
            }
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>⏳ در حال بارگذاری...</div>;
    }

    const currentPreview = previewUrl || formData.imageUrl || DEFAULT_IMAGE;

    // ===== استایل‌های inline برای فرم =====
    const rowStyle = {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: '10px',
        alignItems: 'flex-end',
        width: '100%',
    };

    const fieldStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: 0,
    };

    const labelStyle = {
        fontSize: '11px',
        fontWeight: '500',
        color: 'var(--text-dark)',
        whiteSpace: 'nowrap',
        marginBottom: 0,
        lineHeight: '1.2',
    };

    const inputStyle = {
        width: '100%',
        height: '36px',
        padding: '7px 11px',
        border: '1.5px solid #e8e0d8',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontFamily: 'inherit',
        background: 'white',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const selectStyle = {
        ...inputStyle,
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b3f2b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left 9px center',
        backgroundSize: '10px',
        paddingLeft: '26px',
        paddingRight: '9px',
    };

    return (
        <div className="products-management">
            {toast.show && (
                <div className={`toast-center ${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
                    </span>
                    <span className="toast-text">{toast.message}</span>
                    <button className="toast-close" onClick={closeToast}>✕</button>
                </div>
            )}

            {!showForm && (
                <button className="btn-add-product" onClick={() => setShowForm(true)}>
                    ➕ افزودن محصول جدید
                </button>
            )}

            {showForm && (
                <div className="product-form">
                    <h3 style={{ marginBottom: '14px', fontSize: '13.5px', color: 'var(--text-dark)' }}>
                        {editingProduct ? '✏️ ویرایش محصول' : '➕ افزودن محصول جدید'}
                    </h3>

                    <form onSubmit={handleSubmit} noValidate>
                        {/* ===== همه فیلدها inline در یک سطر ===== */}
                        <div style={rowStyle}>

                            {/* ===== تصویر کوچک ===== */}
                            <div style={{ ...fieldStyle, flex: '0 0 auto', position: 'relative' }}>
                                <span style={labelStyle}>تصویر</span>
                                <div
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    title="کلیک برای انتخاب تصویر"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: '2px dashed #d4a373',
                                        overflow: 'hidden',
                                        background: '#faf5ee',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <img
                                        src={currentPreview}
                                        alt="پیش‌نمایش"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => e.target.src = DEFAULT_IMAGE}
                                    />
                                    {uploading && (
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(255,255,255,0.85)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                        }}>
                                            ⏳
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                />

                                {formData.imageUrl && !uploading && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        title="حذف تصویر"
                                        style={{
                                            position: 'absolute',
                                            top: '14px',
                                            left: '-6px',
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: 'var(--red)',
                                            color: 'white',
                                            border: '2px solid white',
                                            fontSize: '9px',
                                            fontWeight: '900',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0,
                                            lineHeight: 1,
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* ===== نام محصول ===== */}
                            <div style={{ ...fieldStyle, flex: '2 1 180px', minWidth: '130px' }}>
                                <label style={labelStyle}>نام محصول *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="نان سنگک"
                                    style={inputStyle}
                                />
                            </div>

                            {/* ===== قیمت ===== */}
                            <div style={{ ...fieldStyle, flex: '1 1 120px', minWidth: '100px' }}>
                                <label style={labelStyle}>قیمت (ریال) *</label>
                                <input
                                    type="text"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    placeholder="۱۵۰۰۰"
                                    inputMode="numeric"
                                    style={inputStyle}
                                />
                            </div>

                            {/* ===== دسته‌بندی ===== */}
                            <div style={{ ...fieldStyle, flex: '1 1 110px', minWidth: '95px' }}>
                                <label style={labelStyle}>دسته‌بندی</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    style={selectStyle}
                                >
                                    <option value="سنتی">سنتی</option>
                                    <option value="فانتزی">فانتزی</option>
                                </select>
                            </div>

                            {/* ===== موجودی ===== */}
                            <div style={{ ...fieldStyle, flex: '0.8 1 90px', minWidth: '75px' }}>
                                <label style={labelStyle}>موجودی</label>
                                <input
                                    type="text"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleInputChange}
                                    placeholder="۵۰"
                                    inputMode="numeric"
                                    style={inputStyle}
                                />
                            </div>

                            {/* ===== دکمه‌ها ===== */}
                            <div style={{
                                ...fieldStyle,
                                flex: '0 0 auto',
                                flexDirection: 'row',
                                alignItems: 'flex-end',
                                gap: '6px',
                            }}>
                                <button
                                    type="submit"
                                    className="btn-submit-product"
                                    disabled={submitLoading || uploading}
                                    style={{
                                        height: '36px',
                                        padding: '0 16px',
                                        fontSize: '11.5px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {submitLoading
                                        ? '⏳'
                                        : (editingProduct ? '💾 ذخیره' : '➕ افزودن')}
                                </button>
                                <button
                                    type="button"
                                    className="btn-cancel-product"
                                    onClick={resetForm}
                                    disabled={submitLoading || uploading}
                                    style={{
                                        height: '36px',
                                        padding: '0 14px',
                                        fontSize: '11.5px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    ✕ انصراف
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* ===== جدول محصولات ===== */}
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
                            <th>نام</th>
                            <th>دسته‌بندی</th>
                            <th>قیمت (ریال)</th>
                            <th>عملیات</th>
                        </tr>
                        </thead>
                        <tbody>
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <img
                                        src={product.imageUrl || DEFAULT_IMAGE}
                                        alt={product.name}
                                        className="product-table-image"
                                        onError={(e) => e.target.src = DEFAULT_IMAGE}
                                    />
                                </td>
                                <td><strong>{product.name}</strong></td>
                                <td>{product.category || '—'}</td>
                                <td>{formatPrice(product.price || 0)}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="action-btn edit"
                                            onClick={() => handleEdit(product)}
                                            title="ویرایش"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDelete(product.id, product.name)}
                                            title="حذف"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Products;