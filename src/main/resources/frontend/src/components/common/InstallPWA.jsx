// src/components/common/InstallPWA.jsx
import { useEffect, useState } from 'react';
import { showToast } from '../../utils/toast';
import '../../styles/install-pwa.css';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!localStorage.getItem('pwa-install-dismissed')) {
                setVisible(true);
            }
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showToast('بیکو با موفقیت نصب شد', 'success');
        }
        setDeferredPrompt(null);
        setVisible(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-install-dismissed', '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="install-pwa-banner">
            <img src="/bakoLogo.png" alt="بیکو" />
            <div className="install-pwa-text">
                <strong>بیکو را نصب کنید</strong>
                <span>دسترسی سریع‌تر از صفحه اصلی موبایل</span>
            </div>
            <button className="install-pwa-btn" onClick={handleInstall}>نصب</button>
            <button className="install-pwa-close" onClick={handleDismiss}>✕</button>
        </div>
    );
}