import { useState, useEffect } from 'react';
import { auth, checkUserRole } from '../firebase';

export const usePermissions = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const role = await checkUserRole();
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const can = (permission) => {
    switch (permission) {
      case 'deleteAll':
      case 'editData':
      case 'accessAdmin':
        return userRole === 'admin';
      default:
        return false;
    }
  };

  return { userRole, loading, can };
}; 