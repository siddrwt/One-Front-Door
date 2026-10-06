import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingUser = authService.getCurrentUser();
    if (existingUser && authService.isAuthenticated()) {
      setUser(existingUser);
    }
    setLoading(false);
  }, []);

  const login = async (studentId, password) => {
    const res = await authService.login(studentId, password);
    const currentUser = res.student || res.user || { studentId };
    setUser(currentUser);
    return res;
  };

  const signup = async (userData) => {
    const res = await authService.signup(userData);
    const currentUser = res.student || res.user || userData;
    setUser(currentUser);
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
