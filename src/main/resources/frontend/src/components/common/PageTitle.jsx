// src/components/common/PageTitle.jsx
import '../../styles/page-title.css';

/**
 * کامپوننت عنوان صفحه با تصویر و اختیاری کادر جستجو
 *
 * @param {string} image - مسیر تصویر
 * @param {string} fallbackIcon - ایموجی جایگزین
 * @param {string} title - متن عنوان
 * @param {string} subtitle - متن توضیح (اختیاری)
 * @param {string} count - متن سمت چپ (اختیاری)
 * @param {ReactNode} rightContent - محتوای اضافی سمت چپ (اختیاری)
 * @param {string} searchValue - مقدار جستجو
 * @param {function} onSearchChange - تابع تغییر جستجو
 * @param {string} searchPlaceholder - placeholder جستجو
 */
function PageTitle({
                       image,
                       fallbackIcon = '📄',
                       title,
                       subtitle,
                       count,
                       rightContent,
                       searchValue,
                       onSearchChange,
                       searchPlaceholder = 'جستجو...',
                   }) {
    const hasSearch =
        typeof searchValue === 'string' && typeof onSearchChange === 'function';

    return (
        <div className="page-title-wrapper">
            {/* ===== سمت راست: تصویر + عنوان ===== */}
            <div className="page-title-main">
                <span className="page-title-icon-wrap">
                    {image && (
                        <img
                            src={image}
                            alt={title}
                            className="page-title-image"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display =
                                    'inline-flex';
                            }}
                        />
                    )}
                    <span
                        className="page-title-fallback"
                        style={{ display: image ? 'none' : 'inline-flex' }}
                    >
                        {fallbackIcon}
                    </span>
                </span>

                <div className="page-title-text">
                    <h1>{title}</h1>
                    {subtitle && (
                        <p className="page-title-subtitle">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* ===== وسط: کادر جستجو ===== */}
            {hasSearch && (
                <div className="page-title-search">
                    <span className="page-title-search-icon">🔍</span>
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="page-title-search-input"
                    />
                    {searchValue && (
                        <button
                            type="button"
                            className="page-title-search-clear"
                            onClick={() => onSearchChange('')}
                            aria-label="پاک کردن"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* ===== سمت چپ: count یا محتوا ===== */}
            {(count || rightContent) && (
                <div className="page-title-left">
                    {count && (
                        <span className="page-title-count">{count}</span>
                    )}
                    {rightContent}
                </div>
            )}
        </div>
    );
}

export default PageTitle;