import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import HomePage from './components/HomePage';
import ExcelForm from './components/ExcelForm';
import TotalPointsPage from './components/TotalPointsPage';
import SMSPage from './components/SMSPage';
import AdminPanel from './components/AdminPanel';
import { AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/excel-form" element={<ExcelForm />} />
        <Route path="/total-points" element={<TotalPointsPage />} />
        <Route path="/sms" element={<SMSPage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;