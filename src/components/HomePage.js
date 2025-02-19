import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const cards = [
    {
      title: 'إضافة نقاط',
      description: 'إضافة نقاط جديدة للمشاركين',
      icon: '➕',
      path: '/excel-form',
      color: '#0ea5e9'
    },
    {
      title: 'مجموع النقاط',
      description: 'عرض مجموع النقاط لكل مشارك',
      icon: '📊',
      path: '/total-points',
      color: '#10b981'
    },
    {
      title: 'إرسال رسائل SMS',
      description: 'إرسال رسائل نصية للمشاركين',
      icon: '✉️',
      path: '/sms',
      color: '#f59e0b'
    },
    {
      title: 'لوحة التحكم',
      description: 'إدارة النظام وتعديل البيانات',
      icon: '⚙️',
      path: '/admin',
      color: '#6366f1'
    }
  ];

  return (
    <div className="home-container">
      <button onClick={handleLogout} className="logout-button">
        تسجيل الخروج
      </button>
      
      <header className="home-header">
        <h1>لوحة التحكم</h1>
        <p>مرحباً بك في نظام إدارة النقاط</p>
      </header>

      <div className="cards-grid">
        {cards.map((card, index) => (
          <div 
            key={index}
            className="card"
            onClick={() => navigate(card.path)}
          >
            <div className="card-content">
              <div 
                className="card-icon"
                style={{ '--card-color': card.color }}
              >
                {card.icon}
              </div>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;