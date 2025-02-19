// src/components/ExcelForm.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  db, 
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  getDocs 
} from '../firebase';
import './ExcelForm.css';

const ExcelForm = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState({});
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [pointType, setPointType] = useState('individual');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const individualTypes = {
    'بيت': 1,
    'مسجد': 1,
    'ملعب': 1,
    'مطعم': 1,
    'مكتبة': 1
  };

  const groupTypes = {
    'مشروع': 1,
    'مخطط': 1
  };

  const processExcelData = useCallback((data) => {
    try {
      const groupedData = {};
      const uniqueGroups = new Set();

      data.forEach(row => {
        const name = row['name'];
        const group = row['group'];

        if (name && group) {
          if (!groupedData[group]) {
            groupedData[group] = [];
            uniqueGroups.add(group);
          }
          if (!groupedData[group].includes(name)) {
            groupedData[group].push(name);
          }
        }
      });

      // Sort names within each group
      Object.keys(groupedData).forEach(group => {
        groupedData[group].sort();
      });

      return {
        sortedGroupedNames: groupedData
      };
    } catch (error) {
      console.error('Error processing Excel data:', error);
      throw error;
    }
  }, []);

  const loadExcelData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/names.xlsx');
      if (!response.ok) throw new Error('Failed to fetch Excel file');

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      const { sortedGroupedNames } = processExcelData(data);
      setNames(sortedGroupedNames);
      setError('');
    } catch (error) {
      console.error('Error loading Excel data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [processExcelData]);

  useEffect(() => {
    loadExcelData();
  }, [loadExcelData]);

  const handleOptionToggle = (option) => {
    // Create new copies of state to avoid reference issues
    const newSelectedOptions = [...selectedOptions];
    const newSelectedQuantities = { ...selectedQuantities };

    // If option is already selected, remove it
    if (newSelectedOptions.includes(option)) {
      const index = newSelectedOptions.indexOf(option);
      newSelectedOptions.splice(index, 1);
      delete newSelectedQuantities[option];
    } else {
      // If option is not selected, add it
      newSelectedOptions.push(option);
      newSelectedQuantities[option] = 1;
    }

    // Update both states independently
    setSelectedOptions(newSelectedOptions);
    setSelectedQuantities(newSelectedQuantities);
  };

  const handleQuantityChange = (option, quantity) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [option]: quantity
    }));
  };

  const calculateTotalPoints = () => {
    return selectedOptions.reduce((total, option) => {
      return total + (selectedQuantities[option] || 1);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
  
    try {
      const pointsRef = collection(db, 'names');
  
      if (pointType === 'group') {
        // For group points
        const q = query(pointsRef, 
          where('isGroup', '==', true),
          where('groupName', '==', selectedUser.group)
        );
        const querySnapshot = await getDocs(q);
  
        if (querySnapshot.empty) {
          await addDoc(pointsRef, {
            groupName: selectedUser.group,
            isGroup: true,
            points: selectedQuantities,
            timestamp: new Date(),
            type: 'group'
          });
        } else {
          const docRef = querySnapshot.docs[0];
          const existingData = docRef.data();
          const updatedPoints = { ...existingData.points };
          
          Object.entries(selectedQuantities).forEach(([key, value]) => {
            updatedPoints[key] = (updatedPoints[key] || 0) + value;
          });
  
          await updateDoc(docRef.ref, {
            points: updatedPoints,
            timestamp: new Date()
          });
        }
  
        setStatusType('success');
        setSubmitStatus(`تم تحديث النقاط بنجاح للمجموعة ${selectedUser.group}`);
      } else {
        // For individual points
        const q = query(pointsRef, 
          where('name', '==', selectedUser.name),
          where('type', '==', 'individual')
        );
        const querySnapshot = await getDocs(q);
  
        if (querySnapshot.empty) {
          await addDoc(pointsRef, {
            name: selectedUser.name,
            group: selectedUser.group,
            points: selectedQuantities,
            timestamp: new Date(),
            type: 'individual'
          });
        } else {
          const docRef = querySnapshot.docs[0];
          const existingData = docRef.data();
          const updatedPoints = { ...existingData.points };
          
          Object.entries(selectedQuantities).forEach(([key, value]) => {
            updatedPoints[key] = (updatedPoints[key] || 0) + value;
          });
  
          await updateDoc(docRef.ref, {
            points: updatedPoints,
            timestamp: new Date()
          });
        }
  
        setStatusType('success');
        setSubmitStatus(`تم تحديث النقاط بنجاح لـ ${selectedUser.name}`);
      }
  
      setTimeout(() => {
        setSelectedUser(null);
        setSearchQuery('');
        setSelectedOptions([]);
        setSelectedQuantities({});
        setSubmitStatus('');
      }, 3000);
  
    } catch (error) {
      console.error('Detailed error:', error);
      setStatusType('error');
      setSubmitStatus(`حدث خطأ أثناء حفظ النقاط: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      if (pointType === 'group') {
        // Search only through groups
        const filteredGroups = Object.keys(names).filter(group => 
          group.toLowerCase().includes(query.toLowerCase())
        ).map(group => ({
          name: group,
          group: group,
          isGroup: true
        }));
        setSearchResults(filteredGroups);
      } else {
        // Search through individual names
        const filtered = Object.entries(names).flatMap(([group, groupNames]) =>
          groupNames.filter(name => 
            name.toLowerCase().includes(query.toLowerCase())
          ).map(name => ({ name, group }))
        );
        setSearchResults(filtered);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    if (pointType === 'group') {
      setSelectedUser({
        name: user.group, // Use group name as the name
        group: user.group,
        isGroup: true
      });
    } else {
      setSelectedUser(user);
    }
    setSearchQuery('');
    setSearchResults([]);
    setSelectedOptions([]);
    setSelectedQuantities({});
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="form-card">
        <nav className="top-nav">
          <div className="nav-buttons">
            <button 
              className="nav-button home-btn"
              onClick={() => navigate('/home')}
              data-tooltip="الرئيسية"
            >
              <span className="icon">⌂</span>
            </button>
            <button 
              className="nav-button points-btn"
              onClick={() => navigate('/total-points')}
              data-tooltip="النقاط الكلية"
            >
              <span className="icon">📊</span>
            </button>
          </div>
        </nav>

        <header className="card-header">
          <h1>نظام النقاط</h1>
          <div className="tabs">
            <button 
              type="button"
              className={`tab ${pointType === 'individual' ? 'active' : ''}`}
              onClick={() => setPointType('individual')}
            >
              <span className="icon">👤</span>
              نقاط فردية
            </button>
            <button 
              type="button"
              className={`tab ${pointType === 'group' ? 'active' : ''}`}
              onClick={() => setPointType('group')}
            >
              <span className="icon">👥</span>
              نقاط جماعية
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">
            <span className="icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder={pointType === 'individual' ? "ابحث عن اسم..." : "ابحث عن مجموعة..."}
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="search-result-item"
                      onClick={() => handleUserSelect(result)}
                    >
                      {pointType === 'group' ? (
                        <span className="name">{result.group}</span>
                      ) : (
                        <>
                          <span className="name">{result.name}</span>
                          <span className="group">{result.group}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedUser && (
            <div className="selected-user-info">
              <h3>{pointType === 'individual' ? 'معلومات المستخدم' : 'المجموعة المختارة'}</h3>
              <div className="info-grid">
                {pointType === 'individual' ? (
                  <>
                    <div className="info-item">
                      <label>الاسم:</label>
                      <span>{selectedUser.name}</span>
                    </div>
                    <div className="info-item">
                      <label>المجموعة:</label>
                      <span>{selectedUser.group}</span>
                    </div>
                  </>
                ) : (
                  <div className="info-item group-only">
                    <label>المجموعة:</label>
                    <span>{selectedUser.group}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="points-section">
              <h2>
                {pointType === 'individual' ? 'النقاط الفردية' : 'النقاط الجماعية'}
              </h2>
              <div className="points-grid">
                {Object.entries(pointType === 'individual' ? individualTypes : groupTypes)
                  .map(([type, basePoint]) => (
                    <div 
                      key={type} 
                      className={`point-card ${selectedOptions.includes(type) ? 'selected' : ''}`}
                      onClick={() => handleOptionToggle(type)}
                    >
                      <div 
                        className="point-button"
                        role="button"
                        tabIndex={0}
                      >
                        <span className="point-name">{type}</span>
                        {selectedOptions.includes(type) && (
                          <div 
                            className="quantity-controls"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className="quantity-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((selectedQuantities[type] || 1) > 1) {
                                  handleQuantityChange(type, (selectedQuantities[type] || 1) - 1);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label="decrease quantity"
                            >
                              -
                            </div>
                            <span className="quantity">
                              {selectedQuantities[type] || 1}
                            </span>
                            <div
                              className="quantity-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(type, (selectedQuantities[type] || 1) + 1);
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label="increase quantity"
                            >
                              +
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedOptions.length > 0 && (
            <div className="summary-section">
              <div className="summary-content">
                <div className="selected-summary">
                  <h3>النقاط المحددة:</h3>
                  <div className="selected-tags">
                    {selectedOptions.map(type => (
                      <span key={type} className="tag">
                        {type} ({selectedQuantities[type] || 1})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="total-summary">
                  <h3>المجموع:</h3>
                  <span className="total">{calculateTotalPoints()} نقطة</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`submit-button ${isSubmitting ? 'loading' : ''}`}
            disabled={
              !selectedUser ||
              selectedOptions.length === 0 ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                جاري المعالجة...
              </>
            ) : (
              <>
                <span className="icon">✓</span>
                إضافة النقاط
              </>
            )}
          </button>
        </form>

        {submitStatus && (
          <div className={`alert alert-${statusType}`}>
            <span className="icon">
              {statusType === 'success' ? '✓' : '⚠️'}
            </span>
            <span>{submitStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelForm;