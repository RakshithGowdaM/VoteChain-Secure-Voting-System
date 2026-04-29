import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useVote } from '../context/VoteContext';
import { verifyOTP, sendOTP } from '../utils/api';
import styles from './Steps.module.css';

export default function OTPStep() {
  const { state, dispatch } = useVote();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { setCanResend(true); clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...digits];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length < 6) { toast.error('Enter the complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await verifyOTP(otp, state.sessionToken);
      const { authToken, votingToken } = res.data;
      localStorage.setItem('votechain_auth_token', authToken);
      dispatch({ type: 'SET_AUTH', payload: { authToken, votingToken } });
      dispatch({ type: 'SET_STEP', payload: 3 });
      toast.success('Verified! Voting token generated.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP';
      toast.error(msg);
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await sendOTP(state.phone);
      dispatch({ type: 'SET_SESSION', payload: res.data.sessionToken });
      dispatch({ type: 'SET_DEV_OTP', payload: res.data?.devOtp || null });
      setTimer(30);
      setCanResend(false);
      setDigits(['', '', '', '', '', '']);
      if (res.data?.devOtp) {
        toast.success(`Dev OTP: ${res.data.devOtp}`, { duration: 7000 });
      } else {
        toast.success('New OTP sent!');
      }
      const iv = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { setCanResend(true); clearInterval(iv); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error('Failed to resend OTP');
    }
  };

  const maskedPhone = state.phone.replace(/(\+\d{2})(\d{5})(\d{5})/, '$1 $2XXXXX');

  return (
    <div className={styles.screen}>
      <div className={styles.tag}>Step 02 — OTP Verification</div>
      <h1 className={styles.title}>Enter verification code</h1>
      <p className={styles.desc}>A 6-digit OTP was sent to <strong>{maskedPhone}</strong></p>

      {state.devOtp && (
        <div className={styles.notice} data-type="warn">
          <span className={styles.noticeIcon}>!</span>
          <span>
            <strong>Dev OTP:</strong> <code className={styles.devOtpCode}>{state.devOtp}</code>
          </span>
        </div>
      )}

      <div className={styles.otpRow} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => refs.current[i] = el}
            className={styles.otpBox}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
          />
        ))}
      </div>

      <div className={styles.timerWrap}>
        {!canResend ? (
          <span className={styles.timer}>Resend in <strong>{timer}s</strong></span>
        ) : (
          <button className={styles.resendBtn} onClick={handleResend}>Resend OTP →</button>
        )}
      </div>

      <button className={styles.btnPrimary} onClick={handleVerify} disabled={loading}>
        {loading ? <><span className={styles.spinner} /> Verifying...</> : 'Verify & Generate Token'}
      </button>
      <button className={styles.btnGhost} onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
        ← Change number
      </button>
    </div>
  );
}
