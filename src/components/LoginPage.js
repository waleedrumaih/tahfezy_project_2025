import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShowLogin(true);
    }, 2000);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      setError('حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة مرة أخرى.');
    }
  };

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
        {showLogin && (
          <div className="login-card">
            <h2>مرحباً بك</h2>
            <p className="subtitle">قم بتسجيل الدخول للمتابعة</p>
            {error && <div className="error-message">{error}</div>}
            <button 
              onClick={handleGoogleLogin} 
              className="google-login-button"
            >
              <img 
                src="/images/google-icon.png" 
                alt="Google" 
                className="google-icon"
              />
              <span>تسجيل الدخول باستخدام Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage; 