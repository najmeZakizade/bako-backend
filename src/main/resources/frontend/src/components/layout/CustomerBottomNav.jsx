import { NavLink } from 'react-router-dom';
import './customer-bottom-nav.css';

const items = [
    { path: '/', label: 'خانه', icon: '/images/sidebar-icons/home.png' },
    { path: '/products', label: 'منو', icon: '/images/sidebar-icons/products.png' },
    { path: '/cart', label: 'سبد', icon: '/images/sidebar-icons/cart.png' },
    { path: '/my-orders', label: 'سفارش‌ها', icon: '/images/sidebar-icons/my-orders.png' },
    { path: '/profile', label: 'پروفایل', icon: '/images/sidebar-icons/profile.png' },
];

export default function CustomerBottomNav() {
    return (
        <nav className="customer-bottom-nav show-mobile">
            {items.map(item => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                >
                    <img src={item.icon} alt="" width={22} height={22} />
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}