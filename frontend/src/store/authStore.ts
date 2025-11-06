import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  username: string;
  token_balance: number | string; // Can be string from API (Decimal serialization)
  total_trades: number;
  win_rate: number | string; // Can be string from API (Decimal serialization)
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const store = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      set({ token: access_token, isAuthenticated: true });
      await store.getState().fetchUser();
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  register: async (email: string, username: string, password: string) => {
    try {
      await api.post('/auth/register', { email, username, password });
      await store.getState().login(email, password);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data;
      // Convert Decimal fields to numbers
      if (userData.token_balance) {
        userData.token_balance = typeof userData.token_balance === 'string' 
          ? parseFloat(userData.token_balance) 
          : userData.token_balance;
      }
      if (userData.win_rate) {
        userData.win_rate = typeof userData.win_rate === 'string' 
          ? parseFloat(userData.win_rate) 
          : userData.win_rate;
      }
      set({ user: userData });
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      // Only logout if it's an authentication error (401), not other errors
      if (error.response?.status === 401) {
        store.getState().logout();
      }
    }
  },
}));

// Fetch user on mount if token exists
if (store.getState().token) {
  store.getState().fetchUser();
}

