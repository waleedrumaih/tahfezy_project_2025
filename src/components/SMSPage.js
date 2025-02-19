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

const SMSPage = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messagePreview, setMessagePreview] = useState(null);
  const [groupTotals, setGroupTotals] = useState({});

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
    
    // Count of houses (can be used as a joker)
    const houseCount = points['بيت'] || 0;
    
    // Get counts of other point types
    const pointCounts = pointTypes.map(type => points[type] || 0);
    
    // Function to count neighborhoods
    const countNeighborhoods = () => {
      let neighborhoodCount = 0;
      let مخططCount = 0;
      let مشروعCount = 0;
      let remainingHouses = houseCount;
      let remainingPoints = [...pointCounts];
      
      // Try to form neighborhoods using 4 unique things
      while (true) {
        // Count non-zero point types
        const nonZeroPoints = remainingPoints.filter(count => count > 0);
        
        if (nonZeroPoints.length < 4) {
          const missingTypes = 4 - nonZeroPoints.length;
          if (remainingHouses >= missingTypes) {
            neighborhoodCount++;
            remainingHouses -= missingTypes;
            for (let i = 0; i < remainingPoints.length; i++) {
              if (remainingPoints[i] > 0) {
                remainingPoints[i]--;
              }
            }
          } else {
            break;
          }
        } else {
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
        مشروعCount 
      };
    };
    
    return countNeighborhoods();
  }, []);

  const fetchUserPoints = async (userName) => {
    try {
      const allPoints = await fetchAllPoints();
      if (!allPoints) return null;

      const { individualPoints, groupPoints } = allPoints;
      
      // Find the user's points
      const userPoint = individualPoints.find(p => p.name === userName);
      if (!userPoint) return null;

      // Get the user's group points if they belong to a group
      const userGroup = userPoint.group;
      let combinedPoints = { ...userPoint.points };

      if (userGroup && userGroup !== 'Ungrouped' && groupPoints[userGroup]) {
        // Add group points to user points
        Object.entries(groupPoints[userGroup].points).forEach(([type, count]) => {
          combinedPoints[type] = (combinedPoints[type] || 0) + count;
        });
      }

      return combinedPoints;
    } catch (error) {
      console.error('Error fetching user points:', error);
      return null;
    }
  };

  const generateMessage = (points) => {
    const { neighborhoodCount, مخططCount, مشروعCount } = checkForNeighborhood(points);
    
    const pointTypes = ['مكتبة', 'مسجد', 'مطعم', 'ملعب'];
    const missingFacilities = pointTypes.filter(type => !points[type] || points[type] === 0);
    const missingText = missingFacilities.join('، ');

    let message = `•⁠ إمارة منطقة هجر\n\n`;

    // Add achievements
    const achievements = [];
    if (neighborhoodCount > 0) achievements.push(`(${neighborhoodCount}) حي`);
    if (مخططCount > 0) achievements.push(`(${مخططCount}) مخطط`);
    if (مشروعCount > 0) achievements.push(`(${مشروعCount}) مشروع`);

    if (achievements.length > 0) {
      message += `تم تسجيل ${achievements.join(' و ')}\n\n`;
    }

    if (missingFacilities.length > 0) {
      message += `وبقي منشآت (${missingText}) لإكمال الحي القادم \n\n`;
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

      const points = await fetchUserPoints(sampleUser.name);
      if (!points) {
        setMessagePreview('لم يتم العثور على نقاط للمستخدم المحدد.');
        return;
      }

      const message = generateMessage(points);
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

  const handleNameSelect = (userName) => {
    setSelectedNames(prev => {
      if (prev.includes(userName)) {
        return prev.filter(n => n !== userName);
      } else {
        return [...prev, userName];
      }
    });
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
      const messages = await Promise.all(selectedNames.map(async (userName) => {
        const userRecord = names.find(n => n.name === userName);
        if (!userRecord?.phone) {
          console.warn(`No phone number for user: ${userName}`);
          return null;
        }

        const points = await fetchUserPoints(userName);
        if (!points || Object.keys(points).length === 0) {
          console.warn(`No points data found for user: ${userName}`);
          return null; // Skip sending message if no points
        }

        return {
          userName,
          number: userRecord.phone,
          message: generateMessage(points)
        };
      }));

      const validMessages = messages.filter(Boolean);

      for (const { number, message, userName } of validMessages) {
        const response = await fetch('https://app.mobile.net.sa/api/v1/send-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 7fKW0kIsU20XRdBxN0pXSyingO8o3Eo9LAIwANjt'
          },
          body: JSON.stringify({
            numbers: [number.replace('+', '')],
            messageBody: message,
            senderName: "Mobile.SA",
            sendAtOption: "Now"
          })
        });

        const data = await response.json();
        if (data.status !== "Success") {
          throw new Error(`Failed to send message to ${userName}: ${data.message}`);
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

  return (
    <PageTransition>
      <div className="page-container">
        <NavigationPanel />
        <div className="container">
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

          {messagePreview && (
            <div className="message-preview">
              <h3>نموذج الرسالة</h3>
              <div className="message-content">
                <pre>{messagePreview}</pre>
              </div>
              <div className="message-info">
                <span>سيتم إرسال هذه الرسالة إلى {selectedNames.length} مستلم</span>
              </div>
            </div>
          )}

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
    </PageTransition>
  );
};

export default SMSPage;