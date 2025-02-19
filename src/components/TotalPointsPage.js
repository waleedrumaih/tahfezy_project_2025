// src/components/TotalPointsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  db, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  updateDoc
} from '../firebase';
import './TotalPointsPage.css';
import NavigationPanel from './NavigationPanel';
import PageTransition from './PageTransition';
import Header from './Header';

const TotalPointsPage = () => {
  const navigate = useNavigate();
  const [sortedNames, setSortedNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(null);
  const [editPoints, setEditPoints] = useState({});
  const [groupTotals, setGroupTotals] = useState({});

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const pointsRef = collection(db, 'names');
      const querySnapshot = await getDocs(pointsRef);
      
      const allPoints = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Separate individual and group points
      const individualPoints = allPoints.filter(point => point.type === 'individual');
      const groupPoints = allPoints.filter(point => point.type === 'group');

      // Process individual points (without adding group points)
      const processedIndividualPoints = individualPoints.map(point => {
        const { neighborhoodCount, مخططCount, مشروعCount } = checkForNeighborhood(point.points || {});
        const total = Object.values(point.points || {}).reduce((sum, count) => sum + count, 0);
        
        return {
          name: point.name,
          group: point.group || 'Ungrouped',
          points: point.points || {},
          total,
          neighborhoodCount,
          مخططCount,
          مشروعCount
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

      // Sort by total points
      const sortedIndividualPoints = processedIndividualPoints.sort((a, b) => b.total - a.total);

      setSortedNames(sortedIndividualPoints);
      setGroupTotals(processedGroupPoints);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [checkForNeighborhood]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startEditing = (name, points) => {
    setEditingName(name);
    setEditPoints({...points});
  };

  const handlePointChange = (point, value) => {
    const numValue = parseInt(value, 10) || 0;
    setEditPoints(prev => ({
      ...prev,
      [point]: Math.max(0, numValue)
    }));
  };

  const savePointChanges = async () => {
    try {
      console.log('Saving points changes:', { name: editingName, points: editPoints });
      const pointsRef = collection(db, 'names');

      // Check if we're editing a group or individual points
      const isGroupPoints = editingName.startsWith('مجموعة ');
      const groupName = isGroupPoints ? editingName.replace('مجموعة ', '') : null;

      // Delete existing points
      const q = isGroupPoints
        ? query(pointsRef, 
            where('isGroup', '==', true),
            where('groupName', '==', groupName))
        : query(pointsRef, 
            where('name', '==', editingName));

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      // Add new points
      if (isGroupPoints) {
        await addDoc(pointsRef, {
          groupName: groupName,
          isGroup: true,
          points: editPoints,
          timestamp: new Date(),
          type: 'group'
        });
      } else {
        const currentGroup = sortedNames.find(item => item.name === editingName)?.group || 'Ungrouped';
        await addDoc(pointsRef, {
          name: editingName,
          group: currentGroup,
          points: editPoints,
          timestamp: new Date(),
          type: 'individual'
        });
      }

      await fetchData();
      setEditingName(null);
    } catch (error) {
      console.error('Error saving points:', error);
      alert('حدث خطأ أثناء حفظ النقاط');
    }
  };

  const calculateGroupCounts = () => {
    const totals = {};

    // First, add group points from groupTotals
    Object.entries(groupTotals).forEach(([groupName, data]) => {
      if (!totals[groupName]) {
        totals[groupName] = {
          groupPoints: { ...data.points }, // Direct group points
          userPoints: {},                  // Points from users
          neighborhoodCount: 0,
          مخططCount: 0,
          مشروعCount: 0,
          isGroup: true,
          totalPoints: 0
        };
      }
    });

    // Then add individual points to their respective groups
    sortedNames.forEach(item => {
      const groupName = item.group || 'Ungrouped';
      
      if (!totals[groupName]) {
        totals[groupName] = {
          groupPoints: {},
          userPoints: {},
          neighborhoodCount: 0,
          مخططCount: 0,
          مشروعCount: 0,
          isGroup: false,
          totalPoints: 0
        };
      }

      // Add individual points to userPoints
      Object.entries(item.points).forEach(([type, count]) => {
        totals[groupName].userPoints[type] = (totals[groupName].userPoints[type] || 0) + count;
      });
    });

    // Calculate final counts for each group
    const filteredTotals = {};
    Object.entries(totals).forEach(([groupName, groupData]) => {
      // Calculate achievements from group points
      const groupCounts = checkForNeighborhood(groupData.groupPoints);
      
      // Calculate achievements from user points
      const userCounts = checkForNeighborhood(groupData.userPoints);

      // Combine the counts
      groupData.neighborhoodCount = (groupCounts.neighborhoodCount || 0) + (userCounts.neighborhoodCount || 0);
      groupData.مخططCount = (groupCounts.مخططCount || 0) + (userCounts.مخططCount || 0);
      groupData.مشروعCount = (groupCounts.مشروعCount || 0) + (userCounts.مشروعCount || 0);

      // Calculate total points
      const groupPointsTotal = Object.values(groupData.groupPoints).reduce((sum, count) => sum + count, 0);
      const userPointsTotal = Object.values(groupData.userPoints).reduce((sum, count) => sum + count, 0);
      groupData.totalPoints = groupPointsTotal + userPointsTotal;

      // Only include groups that have at least one achievement
      if (groupData.neighborhoodCount > 0 || groupData.مخططCount > 0 || groupData.مشروعCount > 0) {
        filteredTotals[groupName] = groupData;
      }
    });

    return filteredTotals;
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

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
          <Header title="مجموع النقاط" />
          <div className="points-container">
            {sortedNames.length === 0 ? (
              <div className="no-points-message">
                <p>لا توجد نقاط مسجلة حتى الآن</p>
              </div>
            ) : (
              <>
                {/* Desktop Grid View */}
                <div className="points-grid desktop-view">
                  {sortedNames.map(({ name, points, total, neighborhoodCount, مخططCount, مشروعCount, group }) => (
                    <div key={name} className="points-card">
                      <div className="points-card-header">
                        <h2>{name}</h2>
                        <p className="group-name">{group}</p>
                        <span className="total-points-badge">{total} نقطة</span>
                        {neighborhoodCount > 0 && (
                          <span className="neighborhood-badge">{neighborhoodCount} حي</span>
                        )}
                        {مخططCount > 0 && (
                          <span className="مخطط-badge">{مخططCount} مخطط</span>
                        )}
                        {مشروعCount > 0 && (
                          <span className="مشروع-badge">{مشروعCount} مشروع</span>
                        )}
                      </div>
                      
                      <div className="points-breakdown">
                        {Object.entries(points).map(([point, count]) => (
                          <div key={point} className="point-item">
                            <span className="point-name">{point}</span>
                            <span className="point-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile List View */}
                <div className="points-list mobile-view">
                  {sortedNames.map(({ name, points, total, neighborhoodCount, مخططCount, مشروعCount, group }) => (
                    <div key={name} className="list-item">
                      <div className="list-header">
                        <h3>{name}</h3>
                        <span className="group-tag">{group}</span>
                      </div>
                      
                      <div className="list-badges">
                        <span className="total-badge">{total} نقطة</span>
                        {neighborhoodCount > 0 && (
                          <span className="achievement-badge">
                            <span className="badge-icon">🏘️</span>
                            {neighborhoodCount} حي
                          </span>
                        )}
                        {مخططCount > 0 && (
                          <span className="achievement-badge">
                            <span className="badge-icon">📋</span>
                            {مخططCount} مخطط
                          </span>
                        )}
                        {مشروعCount > 0 && (
                          <span className="achievement-badge">
                            <span className="badge-icon">🏗️</span>
                            {مشروعCount} مشروع
                          </span>
                        )}
                      </div>

                      <div className="list-details">
                        {Object.entries(points).map(([point, count]) => (
                          <div key={point} className="detail-row">
                            <span className="detail-label">{point}</span>
                            <span className="detail-value">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default TotalPointsPage;