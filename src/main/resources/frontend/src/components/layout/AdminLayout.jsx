// src/components/layout/AdminLayout.jsx
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import '../../styles/admin-layout.css';
import '../../styles/admin-pages.css';

function AdminLayout() {
    return (
        <div className="admin-layout">
            <div className="admin-body">
                <AdminSidebar />
                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;