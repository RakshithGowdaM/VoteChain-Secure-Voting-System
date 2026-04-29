import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestOtp, adminLogin } from '../api';
import Spinner from '../components/Spinner';

export default function LoginPage() {
  const [tab, setTab] = useState('voter'); // 'voter' | 'admin'
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleVoterSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestOtp(phone);
      navigate('/verify-otp', { state: { phone } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', 'admin');
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page login-page">
      <div className="card login-card">
        <h1 className="login-title">
          🗳️ {process.env.REACT_APP_ELECTION_NAME || 'VoteChain Secure Voting'}
        </h1>
        <p className="login-subtitle">Secure, transparent, blockchain-backed voting</p>

        <div className="tab-bar">
          <button
            className={`tab${tab === 'voter' ? ' active' : ''}`}
            onClick={() => setTab('voter')}
          >
            Voter Login
          </button>
          <button
            className={`tab${tab === 'admin' ? ' active' : ''}`}
            onClick={() => setTab('admin')}
          >
            Admin Login
          </button>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {tab === 'voter' ? (
          <form onSubmit={handleVoterSubmit} className="login-form">
            <label htmlFor="phone">Mobile Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner /> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminSubmit} className="login-form">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner /> : 'Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
