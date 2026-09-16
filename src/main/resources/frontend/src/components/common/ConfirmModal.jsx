// src/components/common/ConfirmModal.jsx
import { useEffect } from 'react';
import '../../styles/confirm-modal.css';

function ConfirmModal({
                          show,
                          title = 'تأیید عملیات',
                          message = 'آیا مطمئن هستید؟',
                          confirmText = 'تأیید',
                          cancelText = 'انصراف',
                          icon = '⚠️',
                          variant = 'danger', // danger | warning | info
                          onConfirm,
                          onCancel,
                          loading = false,
                      }) {
    // قفل اسکرول و بستن با Escape
    useEffect(() => {
        if (!show) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) {
                onCancel?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [show, loading, onCancel]);

    if (!show) return null;

    return (
        <div
            className="confirm-modal-overlay"
            onClick={() => !loading && onCancel?.()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div
                className={`confirm-modal-box confirm-modal-${variant}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ===== هدر ===== */}
                <div className="confirm-modal-header">
                    <div className="confirm-modal-icon-wrap">
                        <span className="confirm-modal-icon">{icon}</span>
                    </div>
                    <h3
                        id="confirm-modal-title"
                        className="confirm-modal-title"
                    >
                        {title}
                    </h3>
                </div>

                {/* ===== متن پیام ===== */}
                <p className="confirm-modal-message">{message}</p>

                {/* ===== دکمه‌ها ===== */}
                <div className="confirm-modal-actions">
                    <button
                        type="button"
                        className="confirm-modal-btn confirm-modal-btn-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`confirm-modal-btn confirm-modal-btn-confirm confirm-modal-btn-${variant}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? '⏳ در حال انجام...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;