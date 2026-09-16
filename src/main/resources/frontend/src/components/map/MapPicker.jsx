// src/components/map/MapPicker.jsx
import { useEffect, useRef, useState } from 'react';

function MapPicker({ center, zoom = 14, onLocationSelect, markerPosition }) {
    const containerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [lastAddress, setLastAddress] = useState(null);

    // ===== تبدیل مختصات به آدرس با Nominatim =====
    const reverseGeocode = async (lat, lng) => {
        try {
            setLoadingAddress(true);

            const url = `/nominatim/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fa&zoom=18&addressdetails=1`;

            console.log('🌍 درخواست آدرس از:', url);

            const response = await fetch(url);
            console.log('📥 وضعیت پاسخ:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 داده دریافتی:', data);

            // 🎯 ساخت آدرس بدون کد پستی
            let fullAddress = null;

            if (data.address) {
                const parts = [];
                const a = data.address;

                if (a.state) parts.push(a.state);
                if (a.county) parts.push(a.county);
                if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
                if (a.suburb || a.neighbourhood) parts.push(a.suburb || a.neighbourhood);
                if (a.road) parts.push(a.road);
                if (a.house_number) parts.push(`پلاک ${a.house_number}`);

                if (parts.length > 0) {
                    fullAddress = parts.join('، ');
                }
            }

            // اگه نتونستیم از address بسازیم، از display_name با فیلتر
            if (!fullAddress && data.display_name) {
                fullAddress = data.display_name
                    .split('،')
                    .filter(part => {
                        const trimmed = part.trim();
                        // ❌ حذف کد پستی (فقط اعداد و خط تیره)
                        return !/^[\d\-۰-۹]+$/.test(trimmed);
                    })
                    .map(p => p.trim())
                    .join('، ');
            }

            console.log('✅ آدرس نهایی:', fullAddress);
            return fullAddress;

        } catch (err) {
            console.error('❌ خطا در دریافت آدرس:', err);
            return null;
        } finally {
            setLoadingAddress(false);
        }
    };

    useEffect(() => {
        if (!containerRef.current || mapInstanceRef.current) return;
        if (!window.L) {
            console.error('❌ Leaflet library not loaded');
            return;
        }

        const map = window.L.map(containerRef.current).setView(
            [center.lat, center.lng],
            zoom
        );

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        map.on('click', async (e) => {
            const { lat, lng } = e.latlng;

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = window.L.marker([lat, lng]).addTo(map);
            }

            onLocationSelect({ lat, lng, address: null });

            const address = await reverseGeocode(lat, lng);

            if (address) {
                setLastAddress(address);
                onLocationSelect({ lat, lng, address });
            }
        });

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current || !markerPosition) return;
        if (markerRef.current) {
            markerRef.current.setLatLng([markerPosition.lat, markerPosition.lng]);
        } else {
            markerRef.current = window.L.marker([markerPosition.lat, markerPosition.lng])
                .addTo(mapInstanceRef.current);
        }
    }, [markerPosition]);

    return (
        <div style={{ position: 'relative' }}>
            <div
                ref={containerRef}
                style={{
                    height: '280px',
                    width: '100%',
                    borderRadius: '8px',
                    border: '2px solid var(--gray)',
                    zIndex: 1,
                }}
            />

            {loadingAddress && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--primary-dark)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    <span style={{
                        width: '10px',
                        height: '10px',
                        border: '2px solid var(--gray)',
                        borderTopColor: 'var(--gold-dark)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block',
                    }}></span>
                    در حال دریافت آدرس...
                </div>
            )}

            {lastAddress && !loadingAddress && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--primary-dark)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    lineHeight: '1.5',
                    maxHeight: '60px',
                    overflowY: 'auto',
                }}>
                    📍 {lastAddress}
                </div>
            )}
        </div>
    );
}

export default MapPicker;