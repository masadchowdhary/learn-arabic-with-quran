import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for saved token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
      // Verify token with server
      authAPI.getMe()
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await authAPI.register(userData);
      const { token, user: newUser } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      const res = await authAPI.login(credentials);
      const { token, user: loggedUser } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'লগইন ব্যর্থ হয়েছে';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch (err) {
      // Token invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      return null;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateUser,
    checkAuth,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
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

export default AuthContext;
