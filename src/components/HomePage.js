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
      color: '#4F46E5'
    },
    {
      title: 'مجموع النقاط',
      description: 'عرض مجموع النقاط لكل مشارك',
      icon: '📊',
      path: '/total-points',
      color: '#059669'
    },
    {
      title: 'إرسال رسائل SMS',
      description: 'إرسال رسائل نصية للمشاركين',
      icon: '✉️',
      path: '/sms',
      color: '#EA580C'
    }
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>لوحة التحكم</h1>
        <button onClick={handleLogout} className="logout-button">
          تسجيل الخروج
        </button>
      </header>

      <main className="cards-grid">
        {cards.map((card, index) => (
          <div 
            key={index}
            className="card"
            style={{ '--card-color': card.color }}
            onClick={() => navigate(card.path)}
          >
            <div className="card-icon">{card.icon}</div>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </div>
        ))}
      </main>
    </div>
  );
};

export default HomePage;