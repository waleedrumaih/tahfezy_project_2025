import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './SMSPage.css';
import './SharedNav.css';

const SMSPage = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messagePreview, setMessagePreview] = useState(null);

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

  useEffect(() => {
    const generatePreview = async () => {
      if (selectedNames.length === 0) {
        setMessagePreview(null);
        return;
      }

      const sampleUser = names.find(n => n.name === selectedNames[0]);
      const userPoints = await calculateUserPoints(sampleUser.name);

      const preview = `•⁠ إمارة منطقة هجر

تم تسجيل (${userPoints?.neighborhoodCount || 0}) أحياء للسكن.
وبقي (${userPoints?.remainingForNextNeighborhood || 0}) منشآت ${userPoints?.missingTypesText || ''}

تمنياتنا لجميع السكان بالتطور والإزدهار الدائم والمستمر.`;

      setMessagePreview(preview);
    };

    generatePreview();
  }, [selectedNames, names]);

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

  // Update the calculateUserPoints function
  const calculateUserPoints = async (name) => {
    try {
      const pointsRef = collection(db, 'names');
      const q = query(pointsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;

      const userDoc = querySnapshot.docs[0].data();
      const points = userDoc.points || {};

      // Point types for neighborhood
      const pointTypes = ['مكتبة', 'مسجد', 'مطعم', 'ملعب'];
      const houseCount = points['بيت'] || 0;
      const pointCounts = pointTypes.map(type => points[type] || 0);
      
      // Calculate neighborhoods
      let neighborhoodCount = 0;
      let remainingHouses = houseCount;
      let remainingPoints = [...pointCounts];
      
      // Try to form neighborhoods using 4 unique things
      while (true) {
        const nonZeroPoints = remainingPoints.filter(count => count > 0);
        
        if (nonZeroPoints.length < 4) {
          const missingTypes = 4 - nonZeroPoints.length;
          if (remainingHouses >= missingTypes) {
            neighborhoodCount++;
            remainingHouses -= missingTypes;
            for (let i = 0; i < remainingPoints.length; i++) {
              if (remainingPoints[i] > 0) remainingPoints[i]--;
            }
          } else {
            break;
          }
        } else {
          neighborhoodCount++;
          for (let i = 0; i < remainingPoints.length; i++) {
            if (remainingPoints[i] > 0) remainingPoints[i]--;
          }
        }
      }

      // Calculate what's needed for next neighborhood
      const missingTypes = pointTypes.filter((type, index) => {
        // Check if user has this type
        const hasType = points[type] && points[type] > 0;
        // If they don't have it, it's missing
        return !hasType;
      }).map(type => {
        switch(type) {
          case 'مكتبة': return 'مكتبة';
          case 'مسجد': return 'مسجد';
          case 'مطعم': return 'مطعم';
          case 'ملعب': return 'ملعب';
          default: return type;
        }
      });

      const missingTypesText = missingTypes.length > 0 ? 
        `(${missingTypes.join('، ')})` : '';

      return {
        neighborhoodCount,
        remainingForNextNeighborhood: missingTypes.length,
        missingTypesText
      };
    } catch (error) {
      console.error('Error calculating points:', error);
      return null;
    }
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
      const messages = await Promise.all(selectedNames.map(async (name) => {
        const userPoints = await calculateUserPoints(name);
        if (!userPoints) return null;

        const personalizedMessage = `•⁠ إمارة منطقة هجر

تم تسجيل (${userPoints.neighborhoodCount}) أحياء للسكن.
وبقي (${userPoints.remainingForNextNeighborhood}) منشآت ${userPoints.missingTypesText}

تمنياتنا لجميع السكان بالتطور والإزدهار الدائم والمستمر.`;

        return {
          number: names.find(n => n.name === name)?.phone,
          message: personalizedMessage
        };
      }));

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
            <div key={`${name}-${phone}`} className="selected-item">
              <span className="selected-name">{name}</span>
              <span className="selected-group">{group}</span>
              <span className="selected-phone">{phone}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessagePreview = () => {
    if (!messagePreview) return null;

    return (
      <div className="message-preview">
        <h3>نموذج الرسالة</h3>
        <div className="message-content">
          <pre>{messagePreview}</pre>
        </div>
        <div className="message-info">
          <span>سيتم إرسال هذه الرسالة إلى {selectedNames.length} مستلم</span>
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
              className="nav-button"
              onClick={() => navigate('/home')}
              data-tooltip="الرئيسية"
            >
              <span className="icon">⌂</span>
            </button>
            <button 
              className="nav-button"
              onClick={() => navigate('/excel-form')}
              data-tooltip="إضافة نقاط"
            >
              <span className="icon">+</span>
            </button>
            <button 
              className="nav-button"
              onClick={() => navigate('/total-points')}
              data-tooltip="مجموع النقاط"
            >
              <span className="icon">∑</span>
            </button>
          </div>
        </nav>
        <h1>إرسال رسائل SMS</h1>
        
        <div className="names-section">
          <div className="names-header">
            <h2>اختر الأسماء</h2>
            <button 
              className={`select-all-btn ${selectedNames.length === names.length ? 'all-selected' : ''}`}
              onClick={handleSelectAll}
            >
              {selectedNames.length === names.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          </div>
          <div className="names-grid">
            {names.map(({ name, group }) => (
              <button
                key={name}
                className={`name-btn ${selectedNames.includes(name) ? 'selected' : ''}`}
                onClick={() => handleNameSelect(name)}
              >
                <span className="name">{name}</span>
                <span className="group">{group}</span>
              </button>
            ))}
          </div>
        </div>

        {renderMessagePreview()}
        {renderSelectedPreview()}

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
      </div>
    </div>
  );
};

export default SMSPage;