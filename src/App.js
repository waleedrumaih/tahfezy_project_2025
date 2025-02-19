import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import Login from './components/Login';
import HomePage from './components/HomePage';
import ExcelForm from './components/ExcelForm';
import TotalPointsPage from './components/TotalPointsPage';
import SMSPage from './components/SMSPage';
import AdminPanel from './components/AdminPanel';
import { AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/home" /> : <LoginPage />}
        />
        <Route 
          path="/home" 
          element={user ? <HomePage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/excel-form" 
          element={user ? <ExcelForm /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/total-points" 
          element={user ? <TotalPointsPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/sms" 
          element={user ? <SMSPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin" 
          element={user ? <AdminPanel /> : <Navigate to="/login" />} 
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;