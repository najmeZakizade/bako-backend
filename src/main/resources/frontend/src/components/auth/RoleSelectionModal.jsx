// src/components/auth/RoleSelectionModal.jsx
import React from 'react';

// ===== اطلاعات نمایشی هر نقش =====
const ROLE_INFO = {
    'CUSTOMER': {
        icon: '🛒',
        label: 'پنل مشتری',
        desc: 'مشاهده محصولات و ثبت سفارش',
        color: '#4CAF50'
    },
    'BAKERY_OWNER': {
        icon: '🏪',
        label: 'پنل نانوایی',
        desc: 'مدیریت محصولات، سفارشات و پرسنل',
        color: '#FF9800'
    },
    'SUPER_ADMIN': {
        icon: '👑',
        label: 'پنل سوپر ادمین',
        desc: 'مدیریت کامل سیستم و نانوایی‌ها',
        color: '#9C27B0'
    },
    'MONITOR': {
        icon: '📊',
        label: 'پنل مانیتورینگ',
        desc: 'مشاهده آمار و نظارت بر سیستم',
        color: '#2196F3'
    },
    'STAFF': {
        icon: '👤',
        label: 'پنل کارمند',
        desc: 'دسترسی محدود به عملیات روزمره',
        color: '#607D8B'
    },
};

function RoleSelectionModal({ show, availableRoles, onSelect, onClose, loading }) {
    if (!show) return null;

    return (
        <div className="role-modal-overlay">
            <div className="role-modal">
                <h2>🎭 انتخاب پنل</h2>
                <p className="role-modal-subtitle">
                    شما به چند پنل دسترسی دارید. لطفاً یکی را انتخاب کنید:
                </p>

                <div className="role-cards">
                    {availableRoles.map((role) => {
                        const info = ROLE_INFO[role] || {
                            icon: '👤',
                            label: role,
                            desc: 'پنل کاربری',
                            color: '#888'
                        };
                        return (
                            <button
                                key={role}
                                className="role-card"
                                onClick={() => onSelect(role)}
                                disabled={loading}
                                style={{ borderColor: info.color }}
                            >
                                <span className="role-card-icon" style={{ color: info.color }}>
                                    {info.icon}
                                </span>
                                <div className="role-card-info">
                                    <strong>{info.label}</strong>
                                    <small>{info.desc}</small>
                                </div>
                                <span className="role-card-arrow">←</span>
                            </button>
                        );
                    })}
                </div>

                {loading && (
                    <div className="role-modal-loading">
                        <span className="spinner-small" />
                        در حال ورود...
                    </div>
                )}

                <button
                    className="role-modal-cancel"
                    onClick={onClose}
                    disabled={loading}
                >
                    انصراف
                </button>
            </div>

            {/* ===== استایل‌ها ===== */}
            <style>{`
                .role-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                    animation: fadeIn 0.25s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .role-modal {
                    background: #fff;
                    border-radius: 16px;
                    padding: 28px 24px;
                    max-width: 460px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
                    animation: slideUp 0.3s ease;
                    text-align: center;
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .role-modal h2 {
                    margin: 0 0 8px;
                    color: #1f110b;
                    font-size: 22px;
                }
                .role-modal-subtitle {
                    color: #666;
                    font-size: 13px;
                    margin: 0 0 20px;
                }
                .role-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .role-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 16px;
                    background: #f9f7f5;
                    border: 2px solid #ddd;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    text-align: right;
                    font-family: inherit;
                }
                .role-card:hover:not(:disabled) {
                    background: #f0ebe5;
                    transform: translateX(-4px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .role-card:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .role-card-icon {
                    font-size: 28px;
                    flex-shrink: 0;
                }
                .role-card-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .role-card-info strong {
                    color: #1f110b;
                    font-size: 15px;
                }
                .role-card-info small {
                    color: #888;
                    font-size: 11px;
                }
                .role-card-arrow {
                    color: #bbb;
                    font-size: 18px;
                    transition: all 0.25s ease;
                }
                .role-card:hover:not(:disabled) .role-card-arrow {
                    color: #5C3317;
                    transform: translateX(-4px);
                }
                .role-modal-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: #5C3317;
                    font-size: 14px;
                    margin: 12px 0;
                }
                .role-modal-loading .spinner-small {
                    display: inline-block;
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(92, 51, 23, 0.3);
                    border-top-color: #5C3317;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .role-modal-cancel {
                    background: transparent;
                    border: none;
                    color: #888;
                    font-size: 13px;
                    cursor: pointer;
                    padding: 8px 16px;
                    font-family: inherit;
                    transition: color 0.2s;
                }
                .role-modal-cancel:hover:not(:disabled) {
                    color: #d32f2f;
                }
                .role-modal-cancel:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

export default RoleSelectionModal;