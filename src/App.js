import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import ExcelForm from './components/ExcelForm';
import TotalPointsPage from './components/TotalPointsPage';
import SMSPage from './components/SMSPage';

function App() {
  try {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/excel-form" element={<ExcelForm />} />
        <Route path="/total-points" element={<TotalPointsPage />} />
        <Route path="/sms" element={<SMSPage />} />
      </Routes>
    );
  } catch (error) {
    console.error('App Error:', error);
    return <div>Error loading application. Check console for details.</div>;
  }
}

export default App;