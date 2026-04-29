import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request when available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const requestOtp = (phone) => api.post('/api/auth/request-otp', { phone });
export const verifyOtp = (phone, otp) => api.post('/api/auth/verify-otp', { phone, otp });
export const adminLogin = (username, password) =>
  api.post('/api/auth/admin-login', { username, password });

// Election
export const getElectionStatus = () => api.get('/api/election/status');

// Candidates
export const getCandidates = () => api.get('/api/candidates');

// Voting
export const castVote = (candidateId) => api.post('/api/vote', { candidateId });
export const getResults = () => api.get('/api/results');

// Admin
export const addCandidate = (data) => api.post('/api/admin/candidates', data);
export const deleteCandidate = (id) => api.delete(`/api/admin/candidates/${id}`);
export const openElection = () => api.post('/api/admin/election/open');
export const closeElection = () => api.post('/api/admin/election/close');
export const publishResults = () => api.post('/api/admin/election/publish');

// Health
export const getHealth = () => api.get('/api/health');

export default api;
