import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import Login from './components/Login';
import HomePage from './components/HomePage';
import ExcelForm from './components/ExcelForm';
import TotalPointsPage from './components/TotalPointsPage';
import SMSPage from './components/SMSPage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/home" /> : <Login />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={user ? "/home" : "/login"} />} 
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;