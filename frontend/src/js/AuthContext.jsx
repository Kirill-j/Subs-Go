import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await axios.get('http://localhost:8080/api/users/me', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          });
          setUser(response.data);
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (err) {
          console.error('Token verification error:', {
            status: err.response?.status,
            message: err.message,
            data: err.response?.data
          });
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const updateToken = (newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const login = async (phoneNumber, password) => {
    try {
      const response = await axios.post('http://localhost:8080/api/public/login', {
        phoneNumber,
        password
      }, { withCredentials: true });
      const newToken = response.data.token;
      updateToken(newToken);
      const userResponse = await axios.get('http://localhost:8080/api/users/me', {
        headers: { Authorization: `Bearer ${newToken}` },
        withCredentials: true
      });
      setUser(userResponse.data);
    } catch (err) {
      console.error('Login error:', {
        status: err.response?.status,
        message: err.message,
        data: err.response?.data
      });
      throw new Error(err.response?.data?.error || 'Ошибка входа');
    }
  };

  const updateUserAndRelogin = async (newPhoneNumber, password) => {
    try {
      await login(newPhoneNumber, password);
    } catch (error) {
      console.error('Ошибка повторного входа после изменения номера:', error);
      throw new Error('Не удалось обновить номер телефона. Попробуйте снова войти с новым номером.');
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:8080/api/public/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken: updateToken, loading, logout, updateUserAndRelogin }}>
      {children}
    </AuthContext.Provider>
  );
};