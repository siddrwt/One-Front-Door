import { request } from './api';

export const authService = {
  async login(identifier, password) {
    const isEmail = identifier && identifier.includes('@');
    const payload = isEmail
      ? { email: identifier, password }
      : { studentId: identifier, password };

    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.student || data.user || { studentId: identifier }));
    }
    return data;
  },

  async signup(userData) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.student || data.user || {}));
    }
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
};
