import React from 'react';
import '../styles/shared.css';

const Header = ({ title, subtitle }) => {
  return (
    <header className="header">
      <img 
        src="/images/logo.png" 
        alt="إمارة منطقة هجر" 
        className="app-logo"
      />
      {title && <h1>{title}</h1>}
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
};

export default Header; 