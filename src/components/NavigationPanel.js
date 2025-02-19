import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './NavigationPanel.css';

const NavigationPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="nav-panel">
      <div className="nav-content">
        <div className="nav-links">
          <button 
            className={`nav-link ${location.pathname === '/home' ? 'active' : ''}`}
            onClick={() => navigate('/home')}
          >
            <span className="icon">⌂</span>
            الرئيسية
          </button>
          <button 
            className={`nav-link ${location.pathname === '/excel-form' ? 'active' : ''}`}
            onClick={() => navigate('/excel-form')}
          >
            <span className="icon">➕</span>
            إضافة نقاط
          </button>
          <button 
            className={`nav-link ${location.pathname === '/total-points' ? 'active' : ''}`}
            onClick={() => navigate('/total-points')}
          >
            <span className="icon">📊</span>
            مجموع النقاط
          </button>
          <button 
            className={`nav-link ${location.pathname === '/sms' ? 'active' : ''}`}
            onClick={() => navigate('/sms')}
          >
            <span className="icon">✉</span>
            الرسائل
          </button>
          <button 
            className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <span className="icon">⚙️</span>
            لوحة التحكم
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationPanel; 