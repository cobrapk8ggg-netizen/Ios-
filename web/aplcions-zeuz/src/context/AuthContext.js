import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const useApp = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token from storage on startup
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setUserToken(token);
          // Fetch user details
          try {
             const response = await api.get('/api/user');
             setUserInfo(response.data.user);
          } catch (e) {
             // If token is invalid, clear it
             await logout();
          }
        }
      } catch (e) {
        console.log('Failed to load token', e);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const login = async (token) => {
    setLoading(true);
    try {
      await AsyncStorage.setItem('userToken', token);
      setUserToken(token);
      const response = await api.get('/api/user');
      setUserInfo(response.data.user);
    } catch (e) {
      console.log('Login error', e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null);
      setUserInfo(null);
    } catch (e) {
      console.log('Logout error', e);
    } finally {
      setLoading(false);
    }
  };

  const getLastRead = async () => {
     // No-op here, HomeScreen fetches it directly for better sync
     return null; 
  };

  return (
    <AuthContext.Provider value={{ userToken, userInfo, login, logout, loading, getLastRead }}>
      {children}
    </AuthContext.Provider>
  );
};