import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs
} from '../firebase';
import './SMSPage.css';
import './SharedNav.css';
import NavigationPanel from './NavigationPanel';
import PageTransition from './PageTransition';
import '../styles/shared.css';
import Header from './Header';

const SMSPage = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messagePreview, setMessagePreview] = useState(null);
  const [groupTotals, setGroupTotals] = useState({});
  const [message, setMessage] = useState('');
  const [facilities, setFacilities] = useState({
    buildings: 0,    // منشآت
    houses: 0,       // بيوت
  });
  const [messageType, setMessageType] = useState('points'); // 'points' or 'custom'
  const [customMessage, setCustomMessage] = useState('');
  const [sendingMessageType, setSendingMessageType] = useState(null);

  const fetchAllPoints = async () => {
    try {
      const pointsRef = collection(db, 'names');
      const querySnapshot = await getDocs(pointsRef);
      
      const allPoints = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Separate individual and group points
      const individualPoints = allPoints.filter(point => point.type === 'individual');
      const groupPoints = allPoints.filter(point => point.type === 'group');

      // Process individual points
      const processedIndividualPoints = individualPoints.map(point => {
        const total = Object.values(point.points || {}).reduce((sum, count) => sum + count, 0);
        
        return {
          name: point.name,
          group: point.group || 'Ungrouped',
          points: point.points || {},
          total
        };
      });

      // Process group points separately
      const processedGroupPoints = groupPoints.reduce((acc, point) => {
        const groupName = point.groupName;
        if (!acc[groupName]) {
          acc[groupName] = {
            points: {},
            isGroup: true,
            type: 'group'
          };
        }

        // Merge points
        Object.entries(point.points || {}).forEach(([type, count]) => {
          acc[groupName].points[type] = (acc[groupName].points[type] || 0) + count;
        });

        return acc;
      }, {});

      return {
        individualPoints: processedIndividualPoints,
        groupPoints: processedGroupPoints
      };
    } catch (error) {
      console.error("Error fetching all points:", error);
      return null;
    }
  };

  const checkForNeighborhood = useCallback((points) => {
    // Predefined list of point types (excluding 'بيت')
    const pointTypes = ['مكتبة', 'مسجد', 'مطعم', 'ملعب'];
    
    // Count of houses
    const houseCount = points['بيت'] || 0;
    
    // Get counts of other point types
    const pointCounts = pointTypes.map(type => points[type] || 0);
    
    // Function to count neighborhoods and remaining facilities
    const countNeighborhoods = () => {
      let neighborhoodCount = 0;
      let مخططCount = 0;
      let مشروعCount = 0;
      let remainingHouses = houseCount;
      let remainingPoints = [...pointCounts];
      let missingFacilities = [];
      
      // Try to form neighborhoods using 4 unique things
      while (true) {
        // Count non-zero point types
        const nonZeroPoints = remainingPoints.filter(count => count > 0);
        const availableTypes = pointTypes.filter((_, index) => remainingPoints[index] > 0);
        
        if (nonZeroPoints.length < 4) {
          const missingTypes = 4 - nonZeroPoints.length;
          if (remainingHouses >= missingTypes) {
            // Can form a neighborhood with houses
            neighborhoodCount++;
            remainingHouses -= missingTypes;
            // Reduce the counts of available facilities
            for (let i = 0; i < remainingPoints.length; i++) {
              if (remainingPoints[i] > 0) {
                remainingPoints[i]--;
              }
            }
          } else {
            // Can't form more neighborhoods
            // Record missing facilities for the next potential neighborhood
            missingFacilities = pointTypes.filter((type, index) => 
              remainingPoints[index] === 0 && !availableTypes.includes(type)
            );
            break;
          }
        } else {
          // Can form a neighborhood with facilities
          neighborhoodCount++;
          for (let i = 0; i < remainingPoints.length; i++) {
            if (remainingPoints[i] > 0) {
              remainingPoints[i]--;
            }
          }
        }
      }

      // Calculate مخطط from neighborhoods
      مخططCount = Math.floor(neighborhoodCount / 3);
      const remainingNeighborhoods = neighborhoodCount % 3;

      // Calculate مشروع from مخطط
      مشروعCount = Math.floor(مخططCount / 3);
      const remainingمخطط = مخططCount % 3;

      // Add direct مخطط and مشروع points
      مخططCount = remainingمخطط + (points['مخطط'] || 0);
      مشروعCount = مشروعCount + (points['مشروع'] || 0);

      return { 
        neighborhoodCount: remainingNeighborhoods, 
        مخططCount, 
        مشروعCount,
        remainingHouses,
        missingFacilities,
        remainingPoints: pointTypes.map((type, index) => ({
          type,
          count: remainingPoints[index]
        })).filter(p => p.count > 0)
      };
    };
    
    return countNeighborhoods();
  }, []);

  const fetchUserPoints = async (userName) => {
    try {
      const allPoints = await fetchAllPoints();
      if (!allPoints) return null;

      const { individualPoints } = allPoints;
      
      // Find the user's points - only individual points, no group points
      const userPoint = individualPoints.find(p => p.name === userName);
      if (!userPoint) return null;

      return userPoint.points;
    } catch (error) {
      console.error('Error fetching user points:', error);
      return null;
    }
  };

  const generateMessage = (points, individualPoints = {}) => {
    const { 
      neighborhoodCount, 
      مخططCount, 
      مشروعCount, 
      remainingHouses,
      missingFacilities,
      remainingPoints 
    } = checkForNeighborhood(points);
    
    let message = `•⁠ إمارة منطقة هجر\n\n`;

    // Build the achievements line
    const parts = [];
    if (neighborhoodCount % 3 > 0) parts.push(`(${neighborhoodCount % 3}) حي`);
    if (مخططCount % 3 > 0) parts.push(`(${مخططCount % 3}) مخطط`);
    if (مشروعCount > 0) parts.push(`(${مشروعCount}) مشروع`);

    if (parts.length > 0) {
      message += `تم تسجيل ${parts.join(' و ')}\n\n`;
    }

    // Add information about current facilities
    if (remainingPoints.length > 0) {
      const currentFacilities = remainingPoints
        .map(p => `(${p.count}) ${p.type}`)
        .join('، ');
      message += `المنشآت المتوفرة: ${currentFacilities}\n\n`;
    }

    // Add information about missing facilities for next neighborhood
    if (missingFacilities.length > 0) {
      message += `تحتاج لإكمال الحي القادم: ${missingFacilities.join('، ')}\n\n`;
    }

    message += 'تمنياتنا لجميع السكان بالتطور والإزدهار الدائم والمستمر.';

    return message;
  };

  const normalizeArabicText = (text) => {
    if (!text) return '';
    return text
      .replace(/[يى]/g, 'ي')
      .replace(/[ةه]/g, 'ه')
      .replace(/[أإآا]/g, 'ا')
      .trim();
  };

  const loadExcelData = async () => {
    try {
      const response = await fetch('/names.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellText: false,
        cellDates: true,
        cellNF: false,
        raw: true
      });
      
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      const rawData = XLSX.utils.sheet_to_json(sheet, { 
        raw: true,
        defval: ''
      });

      const formattedData = rawData.map(row => {
        const formatted = {
          ...row,
          name: normalizeArabicText(row.name),
          phone: formatPhoneNumber(row.number)
        };
        return formatted;
      });

      setNames(formattedData);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      setError('حدث خطأ في تحميل البيانات');
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    let numberStr = '';
    if (typeof phone === 'number') {
      numberStr = phone.toString().includes('e') ? 
        phone.toFixed(0) :
        phone.toString();
    } else {
      numberStr = phone.toString();
    }

    numberStr = numberStr.replace(/\D/g, '');

    if (numberStr.length === 12 && numberStr.startsWith('966')) {
      return `+${numberStr}`;
    } else if (numberStr.length === 9) {
      return `+966${numberStr}`;
    } else if (numberStr.length === 10 && numberStr.startsWith('0')) {
      return `+966${numberStr.substring(1)}`;
    }

    return `+${numberStr}`;
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
      if (!sampleUser) {
        setMessagePreview('لم يتم العثور على المستخدم المحدد.');
        return;
      }

      const userPoint = await fetchUserPoints(sampleUser.name);
      if (!userPoint) {
        setMessagePreview('لم يتم العثور على نقاط للمستخدم المحدد.');
        return;
      }

      // Get individual points separately
      const allPoints = await fetchAllPoints();
      const individualPoint = allPoints.individualPoints.find(p => p.name === sampleUser.name);
      const individualPoints = individualPoint ? individualPoint.points : {};

      const message = generateMessage(userPoint, individualPoints);
      setMessagePreview(message);
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

  const handleNameSelect = async (name) => {
    let newSelectedNames;
    if (selectedNames.includes(name)) {
      newSelectedNames = selectedNames.filter(n => n !== name);
    } else {
      newSelectedNames = [...selectedNames, name];
    }
    setSelectedNames(newSelectedNames);

    // Update message preview for points type
    if (messageType === 'points' && newSelectedNames.length === 1) {
      const points = await fetchUserPoints(name);
      if (points) {
        const allPoints = await fetchAllPoints();
        const individualPoint = allPoints.individualPoints.find(p => p.name === name);
        const individualPoints = individualPoint ? individualPoint.points : {};
        const message = generateMessage(points, individualPoints);
        setMessagePreview(message);
      }
    } else if (messageType === 'points' && newSelectedNames.length === 0) {
      setMessagePreview(null);
    }
  };

  const handleSendSMS = async () => {
    if (selectedNames.length === 0) {
      setError('الرجاء اختيار مستلم واحد على الأقل');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (messageType === 'custom') {
        if (!customMessage.trim()) {
          setError('الرجاء كتابة رسالة');
          setLoading(false);
          return;
        }

        let successCount = 0;
        for (const userName of selectedNames) {
          const userRecord = names.find(n => n.name === userName);
          if (!userRecord?.phone) {
            console.warn(`No phone number for user: ${userName}`);
            continue;
          }

          const response = await fetch('https://app.mobile.net.sa/api/v1/send-bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer 7fKW0kIsU20XRdBxN0pXSyingO8o3Eo9LAIwANjt'
            },
            body: JSON.stringify({
              numbers: [userRecord.phone.replace('+', '')],
              messageBody: customMessage,
              senderName: "Mobile.SA",
              sendAtOption: "Now"
            })
          });

          const data = await response.json();
          if (data.status === "Success") {
            successCount++;
          } else {
            console.warn(`Failed to send message to ${userName}: ${data.message}`);
          }
        }

        if (successCount > 0) {
          setSuccess(`تم إرسال ${successCount} رسالة بنجاح`);
          setCustomMessage('');
        } else {
          throw new Error('فشل إرسال جميع الرسائل');
        }
      } else {
        let successCount = 0;
        for (const userName of selectedNames) {
          const userRecord = names.find(n => n.name === userName);
          if (!userRecord?.phone) {
            console.warn(`No phone number for user: ${userName}`);
            continue;
          }

          const points = await fetchUserPoints(userName);
          if (!points || Object.keys(points).length === 0) {
            console.warn(`No points data found for user: ${userName}`);
            continue;
          }

          const allPoints = await fetchAllPoints();
          const individualPoint = allPoints.individualPoints.find(p => p.name === userName);
          const individualPoints = individualPoint ? individualPoint.points : {};
          const message = generateMessage(points, individualPoints);

          const response = await fetch('https://app.mobile.net.sa/api/v1/send-bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer 7fKW0kIsU20XRdBxN0pXSyingO8o3Eo9LAIwANjt'
            },
            body: JSON.stringify({
              numbers: [userRecord.phone.replace('+', '')],
              messageBody: message,
              senderName: "Mobile.SA",
              sendAtOption: "Now"
            })
          });

          const data = await response.json();
          if (data.status === "Success") {
            successCount++;
          } else {
            console.warn(`Failed to send message to ${userName}: ${data.message}`);
          }
        }

        if (successCount > 0) {
          setSuccess(`تم إرسال ${successCount} رسالة بنجاح`);
        } else {
          throw new Error('فشل إرسال جميع الرسائل');
        }
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      setError(error.message || 'حدث خطأ أثناء إرسال الرسائل');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total facilities
  const calculateTotalFacilities = () => {
    // If there's a house, it counts as a neighbor and adds to total facilities
    const totalBuildings = facilities.buildings;
    const hasHouse = facilities.houses > 0;
    
    // If there's a house, add it as a new facility
    const totalFacilities = hasHouse ? totalBuildings + 1 : totalBuildings;
    
    return {
      total: totalFacilities,
      originalBuildings: facilities.buildings,
      hasHouse: hasHouse
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFacilities(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  // Update the message type selection handler
  const handleMessageTypeChange = (type) => {
    if (type !== messageType) {
      setMessageType(type);
      setSelectedNames([]); // Clear selected names when switching message type
      setMessagePreview(null); // Clear any existing preview
      if (type === 'custom') {
        setCustomMessage(''); // Clear custom message when switching to points
      }
    }
  };

  return (
    <PageTransition>
      <div className="page-container">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <NavigationPanel />
        <div className="container">
          <Header title="إرسال رسائل SMS" />
          <div className="sms-container">
            <div className="message-type-selector">
              <button 
                className={`type-button ${messageType === 'points' ? 'active' : ''}`}
                onClick={() => handleMessageTypeChange('points')}
              >
                <span className="icon">🎯</span>
                <span className="text">إرسال النقاط</span>
              </button>
              <button 
                className={`type-button ${messageType === 'custom' ? 'active' : ''}`}
                onClick={() => handleMessageTypeChange('custom')}
              >
                <span className="icon">✉️</span>
                <span className="text">رسالة مخصصة</span>
              </button>
            </div>

            <div className="names-section">
              <div className="names-header">
                <h2>اختر المستلمين</h2>
                <button 
                  className={`select-all-btn ${selectedNames.length === names.length ? 'all-selected' : ''}`}
                  onClick={handleSelectAll}
                >
                  {selectedNames.length === names.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>
              <div className="names-grid">
                {names.map(({ name, group, phone }, index) => (
                  <button 
                    key={`${name}-${index}`}
                    className={`name-btn ${selectedNames.includes(name) ? 'selected' : ''}`}
                    onClick={() => handleNameSelect(name)}
                  >
                    <span className="name">{name}</span>
                    <span className="group">{group}</span>
                    <span className="phone">{phone}</span>
                  </button>
                ))}
              </div>
            </div>

            {messageType === 'custom' ? (
              <div className="custom-message-section">
                <textarea
                  className="message-input"
                  placeholder="اكتب رسالتك هنا..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                />
                <p className="char-count">
                  {customMessage.length}/160 حرف
                </p>
                
                {customMessage && (
                  <div className="message-preview">
                    <h3>معاينة الرسالة</h3>
                    <div className="message-content">
                      <pre>{customMessage}</pre>
                    </div>
                    {selectedNames.length > 0 && (
                      <div className="message-info">
                        <span>سيتم إرسال هذه الرسالة إلى {selectedNames.length} مستلم</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              messagePreview && (
                <div className="message-preview">
                  <h3>نموذج الرسالة</h3>
                  <div className="message-content">
                    <pre>{messagePreview}</pre>
                  </div>
                  <div className="message-info">
                    <span>سيتم إرسال هذه الرسالة إلى {selectedNames.length} مستلم</span>
                  </div>
                </div>
              )
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button 
              className="send-button"
              onClick={handleSendSMS}
              disabled={
                loading || 
                selectedNames.length === 0 || 
                (messageType === 'custom' && !customMessage.trim())
              }
            >
              {loading ? (
                <span className="loading-text">
                  جاري إرسال {messageType === 'custom' ? 'الرسائل المخصصة' : 'رسائل النقاط'}...
                </span>
              ) : (
                <span>
                  إرسال {messageType === 'custom' ? 'الرسائل المخصصة' : 'رسائل النقاط'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SMSPage;