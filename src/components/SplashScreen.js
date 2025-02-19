import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Start the animation sequence
    setTimeout(() => {
      setAnimationComplete(true);
    }, 2000); // Logo animation duration

    // Navigate to login after animation
    setTimeout(() => {
      navigate('/login');
    }, 3000); // Total animation duration
  }, [navigate]);

  return (
    <div className="splash-screen">
      <div className={`logo-container ${animationComplete ? 'slide-up' : ''}`}>
        <img 
          src="/images/logo.png" 
          alt="إمارة منطقة هجر" 
          className="splash-logo"
        />
      </div>
    </div>
  );
};

export default SplashScreen; 