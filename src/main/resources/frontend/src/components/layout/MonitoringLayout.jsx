// src/components/layout/MonitoringLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MonitoringSidebar from './MonitoringSidebar';
import '../../styles/admin-layout.css';
import '../../styles/admin-pages.css';
import '../../styles/monitoring.css';

/* ============================================================
   🆕 تشخیص صفحه کوچک
   ============================================================ */
const isSmallScreen = () =>
    typeof window !== 'undefined' && window.innerWidth <= 900;

function MonitoringLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(!isSmallScreen());
    const location = useLocation();

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    /* ============================================================
       🆕 هماهنگی با تغییر اندازه صفحه
       ============================================================ */
    useEffect(() => {
        let lastWasSmall = isSmallScreen();

        const handleResize = () => {
            const nowSmall = isSmallScreen();
            if (nowSmall !== lastWasSmall) {
                lastWasSmall = nowSmall;
                setSidebarOpen(!nowSmall);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /* ============================================================
       🆕 بستن خودکار در موبایل با تغییر مسیر
       ============================================================ */
    useEffect(() => {
        if (isSmallScreen()) {
            setSidebarOpen(false);
        }
    }, [location.pathname]);

    /* ============================================================
       🆕 قفل اسکرول بدنه وقتی Drawer باز است
       ============================================================ */
    useEffect(() => {
        if (isSmallScreen() && sidebarOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
        return undefined;
    }, [sidebarOpen]);

    return (
        <div className="admin-layout monitoring-layout">
            {/* 🆕 دکمه همبرگری — فقط موبایل */}
            <button
                className="admin-hamburger"
                onClick={toggleSidebar}
                aria-label="باز کردن منو"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 6h18M3 12h18M3 18h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
            </button>

            {/* 🆕 Overlay پشت Drawer */}
            {sidebarOpen && (
                <div
                    className="admin-sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <div className="admin-body">
                <MonitoringSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default MonitoringLayout;