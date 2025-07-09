// /frontend/src/utils/api.js
import axios from 'axios';

// Default‐Instanz, die Credentials (Cookies) mitschickt
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true, // wichtig, um HttpOnly-Cookies mitzuschicken
});

// Für jeden Request: wenn lokales JWT im Storage ist, füge es als Bearer ein
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;