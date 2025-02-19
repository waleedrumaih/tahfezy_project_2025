import React, { useState, useEffect } from 'react';
import { db, collection, query, getDocs, updateDoc, doc, deleteDoc } from '../firebase';
import './AdminPanel.css';
import NavigationPanel from './NavigationPanel';
import PageTransition from './PageTransition';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editedPoints, setEditedPoints] = useState({});

  const pointTypes = {
    'بيت': 'house',
    'مسجد': 'mosque',
    'ملعب': 'playground',
    'مطعم': 'restaurant',
    'مكتبة': 'library',
    'مشروع': 'project',
    'مخطط': 'plan'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'names');
      const querySnapshot = await getDocs(usersRef);
      
      const userData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        points: doc.data().points || {}
      }));

      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditedPoints(user.points);
  };

  const handlePointChange = (type, value) => {
    setEditedPoints(prev => ({
      ...prev,
      [type]: parseInt(value) || 0
    }));
  };

  const handleSavePoints = async () => {
    try {
      setLoading(true);
      const userRef = doc(db, 'names', editingUser.id);
      await updateDoc(userRef, {
        points: editedPoints
      });
      
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, points: editedPoints }
          : user
      ));
      
      setEditingUser(null);
      alert('تم حفظ النقاط بنجاح');
    } catch (error) {
      console.error('Error saving points:', error);
      alert('حدث خطأ في حفظ النقاط');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllPoints = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete all points?");
    if (!confirmDelete) return;

    try {
      const usersRef = collection(db, 'names');
      const querySnapshot = await getDocs(usersRef);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      fetchUsers(); // Refresh the user list after deletion
      alert('All points have been deleted successfully.');
    } catch (error) {
      console.error('Error deleting points:', error);
      alert('An error occurred while deleting points.');
    }
  };

  return (
    <PageTransition>
      <div className="page-container">
        <NavigationPanel />
        <div className="container">
          <div className="admin-panel">
            <h1>لوحة التحكم</h1>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : (
              <div className="users-grid">
                {users.map(user => (
                  <div key={user.id} className="user-card">
                    <div className="user-header">
                      <h3>
                        {user.type === 'group' ? `مجموعة: ${user.groupName}` : user.name}
                      </h3>
                      {user.type !== 'group' && user.group && (
                        <span className="group-tag">{user.group}</span>
                      )}
                    </div>
                    
                    <div className="points-section">
                      {editingUser?.id === user.id ? (
                        // Edit mode
                        <>
                          <div className="editing-title">
                            {user.type === 'group' ? 
                              `تعديل نقاط مجموعة ${user.groupName}` : 
                              `تعديل نقاط ${user.name}`
                            }
                          </div>
                          {Object.keys(pointTypes).map(type => (
                            <div key={type} className="point-input-group">
                              <label>{type}</label>
                              <input
                                type="number"
                                value={editedPoints[type] || 0}
                                onChange={(e) => handlePointChange(type, e.target.value)}
                                min="0"
                              />
                            </div>
                          ))}
                          <div className="edit-actions">
                            <button 
                              className="save-btn"
                              onClick={handleSavePoints}
                              disabled={loading}
                            >
                              حفظ
                            </button>
                            <button 
                              className="cancel-btn"
                              onClick={() => setEditingUser(null)}
                            >
                              إلغاء
                            </button>
                          </div>
                        </>
                      ) : (
                        // View mode
                        <>
                          <div className="points-grid">
                            {Object.entries(user.points).map(([type, count]) => (
                              <div key={type} className="point-item">
                                <span className="point-label">{type}</span>
                                <span className="point-value">{count}</span>
                              </div>
                            ))}
                          </div>
                          <button 
                            className="edit-btn"
                            onClick={() => handleEditClick(user)}
                          >
                            تعديل النقاط
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="delete-all-points-container">
              <button className="delete-all-points-btn" onClick={deleteAllPoints}>
                حذف جميع النقاط
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminPanel; 