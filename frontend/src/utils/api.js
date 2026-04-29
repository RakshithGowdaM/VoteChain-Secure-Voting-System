import axios from 'axios';

const resolveFallbackBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000/api';
  }

  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // Local setups are commonly split FE:3000 and BE:5000 without same-origin proxy.
  if (isLocalHost) {
    return 'http://localhost:5000/api';
  }

  return `${window.location.origin}/api`;
};

const fallbackBaseURL = resolveFallbackBaseUrl();

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || fallbackBaseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('votechain_auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('votechain_auth_token');
      localStorage.removeItem('votechain_session');
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const sendOTP = (phone) => api.post('/auth/send-otp', { phone });
export const verifyOTP = (otp, sessionToken) => api.post('/auth/verify-otp', { otp, sessionToken });

// ── Candidates ────────────────────────────────────────────────────────────────
export const getCandidates = () => api.get('/candidates');
export const getResults = () => api.get('/candidates/results');

// ── Vote ──────────────────────────────────────────────────────────────────────
export const castVote = (candidateId) => api.post('/vote/cast', { candidateId });
export const getVoteStatus = () => api.get('/vote/status');
export const verifyTransaction = (txHash) => api.get(`/vote/verify/${txHash}`);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminLogin = (username, password) => api.post('/admin/login', { username, password });
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getAdminVotes = (page = 1) => api.get(`/admin/votes?page=${page}`);
export const getAdminVoters = (page = 1) => api.get(`/admin/voters?page=${page}`);
export const getAdminCandidates = () => api.get('/admin/candidates');
export const createAdminCandidate = (payload) => api.post('/admin/candidates', payload);
export const removeAdminCandidate = (candidateId) => api.delete(`/admin/candidates/${candidateId}`);
export const getAdminResultSettings = () => api.get('/admin/results-settings');
export const updateAdminResultSettings = (publishAt) => api.put('/admin/results-settings', { publishAt });
export const getAdminElectionWindow = () => api.get('/admin/election-window');
export const updateAdminElectionWindow = (electionStartAt, electionEndAt) => api.put('/admin/election-window', { electionStartAt, electionEndAt });
export const setAdminVotingLock = (locked) => api.put('/admin/voting-lock', { locked });
export const endAdminElection = () => api.post('/admin/end-election');
export const exportAdminDataCsv = (type = 'votes') => api.get(`/admin/export-data?type=${encodeURIComponent(type)}`, { responseType: 'blob' });
export const clearAllAdminData = () => api.post('/admin/clear-all-data', { confirmation: 'CLEAR_ALL' });

export default api;
