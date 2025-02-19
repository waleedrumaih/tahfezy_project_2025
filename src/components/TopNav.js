import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navButtons = [
    {
      path: '/home',
      tooltip: 'الرئيسية',
      icon: '⌂'
    },
    {
      path: '/excel',
      tooltip: 'إضافة نقاط',
      icon: '+'
    },
    {
      path: '/total-points',
      tooltip: 'مجموع النقاط',
      icon: '∑'
    },
    {
      path: '/sms',
      tooltip: 'إرسال رسائل',
      icon: '✉'
    }
  ];

  console.log('Current location:', location.pathname);

  return (
    <nav className="top-nav">
      <div className="nav-buttons">
        {navButtons.map((button) => {
          console.log('Rendering button:', button.path);
          return (
            <button 
              key={button.path}
              className={`nav-button ${location.pathname === button.path ? 'active' : ''}`}
              onClick={() => navigate(button.path)}
              data-tooltip={button.tooltip}
            >
              <span className="icon">{button.icon}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TopNav; 