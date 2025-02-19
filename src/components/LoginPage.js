import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to homepage after logo animation
    const timer = setTimeout(() => {
      navigate('/home');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
      <div className="login-content">
        <img 
          src="/images/logo.png" 
          alt="إمارة منطقة هجر" 
          className="logo"
        />
      </div>
    </div>
  );
};

export default LoginPage; 