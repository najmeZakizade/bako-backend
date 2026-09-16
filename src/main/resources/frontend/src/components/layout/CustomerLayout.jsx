// src/components/layout/CustomerLayout.jsx
import { Outlet } from 'react-router-dom';
import CustomerSidebar from './CustomerSidebar';
import '../../styles/customer-layout.css';

function CustomerLayout() {
    return (
        <div className="customer-layout">
            <CustomerSidebar />
            <div className="customer-content">
                <Outlet />
            </div>
        </div>
    );
}

export default CustomerLayout;