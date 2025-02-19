import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import '../styles/shared.css';
import Header from './Header';

const HomePage = () => {
  const navigate = useNavigate();

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
    <div className="page-container">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <div className="container">
        <Header 
          title="لوحة التحكم"
          subtitle="مرحباً بك في نظام إدارة النقاط"
        />
        
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
    </div>
  );
};

export default HomePage;