import { useEffect, useState } from 'react';

export default function OfflineBanner() {
    const [offline, setOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const on = () => setOffline(false);
        const off = () => setOffline(true);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    if (!offline) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            background: '#d9534f', color: '#fff',
            padding: '8px', textAlign: 'center',
            fontSize: '13px', zIndex: 10000
        }}>
            📡 اتصال اینترنت قطع است — از حالت آفلاین استفاده می‌کنید
        </div>
    );
}