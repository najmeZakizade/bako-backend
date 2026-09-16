// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import moment from 'moment-jalaali';

// تنظیم locale شمسی برای کل برنامه
moment.loadPersian({ dialect: 'persian-modern' });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);