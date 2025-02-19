import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import './Login.css';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);
      navigate('/home');
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>نظام النقاط</h1>
          <p>منصة إدارة وتتبع النقاط بكل سهولة</p>
        </div>

        <div className="login-content">
          <button 
            className="google-login-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <img src="/google-icon.png" alt="Google" className="google-icon" />
                <span>تسجيل الدخول باستخدام Google</span>
              </>
            )}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login; 