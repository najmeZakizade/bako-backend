// src/components/layout/MonitoringLayout.jsx
import { Outlet } from 'react-router-dom';
import MonitoringSidebar from './MonitoringSidebar';
import '../../styles/admin-layout.css';
import '../../styles/admin-pages.css';
import '../../styles/monitoring.css';

function MonitoringLayout() {
    return (
        <div className="admin-layout monitoring-layout">
            <div className="admin-body">
                <MonitoringSidebar />
                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default MonitoringLayout;