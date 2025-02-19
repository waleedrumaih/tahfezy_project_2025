import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './SMSPage.css';

const SMSPage = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadExcelData = async () => {
    try {
      const response = await fetch('/names.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      setNames(data);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      setError('حدث خطأ في تحميل البيانات');
    }
  };

  useEffect(() => {
    loadExcelData();
  }, []);

  const handleSelectAll = () => {
    if (selectedNames.length === names.length) {
      setSelectedNames([]);
    } else {
      setSelectedNames(names.map(n => n.name));
    }
  };

  const handleNameSelect = (name) => {
    setSelectedNames(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleGroupSelect = (group) => {
    // Get all names from this group
    const groupNames = names.filter(n => n.group === group).map(n => n.name);
    
    // Check if all names from this group are currently selected
    const allGroupNamesSelected = groupNames.every(name => selectedNames.includes(name));
    
    // Create a new copy of selectedNames
    let newSelectedNames = [...selectedNames];
    
    if (allGroupNamesSelected) {
      // If all selected, remove only this group's names
      newSelectedNames = newSelectedNames.filter(name => !groupNames.includes(name));
    } else {
      // If not all selected, add only missing names from this group
      groupNames.forEach(name => {
        if (!newSelectedNames.includes(name)) {
          newSelectedNames.push(name);
        }
      });
    }
    
    setSelectedNames(newSelectedNames);
  };

  // Add this function to calculate points and remaining items
  const calculateUserPoints = (name) => {
    const user = names.find(n => n.name === name);
    if (!user) return null;

    // Get user's points from TotalPointsPage logic
    const points = {}; // You'll need to get this from your database
    
    // Count complete neighborhoods
    const pointTypes = ['مكتبة', 'مسجد', 'مطعم', 'ملعب', 'بيت'];
    let neighborhoodCount = 0;
    let remainingItems = 0;

    // Count how many of each type
    const typeCounts = {};
    pointTypes.forEach(type => {
      typeCounts[type] = points[type] || 0;
    });

    // Calculate complete neighborhoods
    while (true) {
      const availableTypes = pointTypes.filter(type => typeCounts[type] > 0);
      if (availableTypes.length >= 4) {
        neighborhoodCount++;
        availableTypes.slice(0, 4).forEach(type => {
          typeCounts[type]--;
        });
      } else {
        remainingItems = 4 - availableTypes.length;
        break;
      }
    }

    return {
      neighborhoodCount,
      remainingItems
    };
  };

  // Update handleSendSMS function
  const handleSendSMS = async () => {
    if (selectedNames.length === 0) {
      setError('الرجاء اختيار مستلم واحد على الأقل');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create personalized messages for each recipient
      const messages = selectedNames.map(name => {
        const userPoints = calculateUserPoints(name);
        if (!userPoints) return null;

        const personalizedMessage = `•⁠  ⁠إمارة منطقة هجر:

تم تسجيل (${userPoints.neighborhoodCount}) أحياء للساكن: 
وبقي (${userPoints.remainingItems}) لإكمال حي`;

        return {
          number: names.find(n => n.name === name)?.phone,
          message: personalizedMessage
        };
      }).filter(Boolean);

      // Send messages in batches
      for (const { number, message } of messages) {
        const response = await fetch('https://app.mobile.net.sa/api/v1/send-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 7fKW0kIsU20XRdBxN0pXSyingO8o3Eo9LAIwANjt'
          },
          body: JSON.stringify({
            numbers: [number],
            messageBody: message,
            senderName: "Mobile.SA",
            sendAtOption: "Now"
          })
        });

        const data = await response.json();

        if (data.status !== "Success") {
          throw new Error(data.message || 'فشل إرسال الرسائل');
        }
      }

      setSuccess('تم إرسال الرسائل بنجاح');
      setSelectedNames([]);
    } catch (error) {
      console.error('Error sending SMS:', error);
      setError(error.message || 'حدث خطأ أثناء إرسال الرسائل');
    } finally {
      setLoading(false);
    }
  };

  // Get unique groups
  const groups = [...new Set(names.map(n => n.group))];

  // Add a preview of selected numbers
  const renderSelectedPreview = () => {
    if (selectedNames.length === 0) return null;

    const selectedData = selectedNames.map(name => 
      names.find(n => n.name === name)
    ).filter(Boolean);

    return (
      <div className="selected-preview">
        <h3>المستلمون المحددون:</h3>
        <div className="selected-list">
          {selectedData.map(({ name, phone, group }) => (
            <div key={name} className="selected-item">
              <span className="selected-name">{name}</span>
              <span className="selected-group">{group}</span>
              <span className="selected-phone">{phone}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="sms-page">
      <div className="sms-container">
        <nav className="top-nav">
          <div className="nav-buttons">
            <button 
              className="nav-button home-btn"
              onClick={() => navigate('/home')}
              data-tooltip="الرئيسية"
            >
              <span className="icon">⌂</span>
            </button>
          </div>
        </nav>
        <h1>إرسال رسائل SMS</h1>
        
        <div className="selection-section">
          <div className="selection-header">
            <h2>اختيار المستلمين</h2>
            <button 
              className={`select-all-btn ${selectedNames.length === names.length ? 'active' : ''}`}
              onClick={handleSelectAll}
            >
              {selectedNames.length === names.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          </div>

          <div className="groups-section">
            <h3>المجموعات</h3>
            <div className="groups-grid">
              {groups.map(group => {
                const groupNames = names.filter(n => n.group === group).map(n => n.name);
                const allGroupNamesSelected = groupNames.every(name => selectedNames.includes(name));
                
                return (
                  <button
                    key={group}
                    className={`group-btn ${allGroupNamesSelected ? 'selected' : ''}`}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <span className="group-name">{group}</span>
                    <span className="group-count">{groupNames.length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="names-section">
            <h3>الأسماء</h3>
            <div className="names-grid">
              {names.map(({ name, phone, group }) => (
                <div 
                  key={name}
                  className={`name-card ${selectedNames.includes(name) ? 'selected' : ''}`}
                  onClick={() => handleNameSelect(name)}
                >
                  <div className="name-info">
                    <span className="name">{name}</span>
                    <span className="group-tag">{group}</span>
                  </div>
                  <span className="phone">{phone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          className="send-button"
          onClick={handleSendSMS}
          disabled={loading || selectedNames.length === 0}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              جاري الإرسال...
            </>
          ) : (
            'إرسال الرسائل'
          )}
        </button>

        {renderSelectedPreview()}
      </div>
    </div>
  );
};

export default SMSPage; 