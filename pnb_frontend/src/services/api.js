// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const api = {
  get: (endpoint) => axios.get(`${API_BASE_URL}${endpoint}`),
  post: (endpoint, data) => axios.post(`${API_BASE_URL}${endpoint}`, data),

  getDashboard: () => axios.get(`${API_BASE_URL}/api/dashboard`),
  getCbom: () => axios.get(`${API_BASE_URL}/api/cbom-dashboard`),
  getPqc: () => axios.get(`${API_BASE_URL}/api/pqc-compliance`),
  scanUrl: (targetUrl) => axios.post(`${API_BASE_URL}/api/scan`, { target_url: targetUrl }),
  scanAllPnb: () => axios.post(`${API_BASE_URL}/api/scan-all`),
  
  // NEW DELETE ENDPOINT
  deleteScan: (id) => axios.delete(`${API_BASE_URL}/api/scan/${id}`), 
};
