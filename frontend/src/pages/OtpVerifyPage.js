import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp } from '../api';
import Spinner from '../components/Spinner';

export default function OtpVerifyPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const phone = state?.phone || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(phone, otp);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', 'voter');
      navigate('/vote');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  }

  if (!phone) {
    navigate('/');
    return null;
  }

  return (
    <div className="page login-page">
      <div className="card login-card">
        <h2>Verify Your Identity</h2>
        <p className="login-subtitle">
          Enter the 6-digit OTP sent to <strong>{phone}</strong>
        </p>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="otp">One-Time Password</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Spinner /> : 'Verify & Continue'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/')}
          >
            ← Back
          </button>
        </form>
      </div>
    </div>
  );
}
