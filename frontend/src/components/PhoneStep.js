import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useVote } from '../context/VoteContext';
import { sendOTP } from '../utils/api';
import styles from './Steps.module.css';

export default function PhoneStep() {
  const { state, dispatch } = useVote();
  const [phone, setPhone] = useState(state.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const fullPhone = cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
      const res = await sendOTP(fullPhone);
      dispatch({ type: 'SET_PHONE', payload: fullPhone });
      dispatch({ type: 'SET_SESSION', payload: res.data.sessionToken });
      dispatch({ type: 'SET_DEV_OTP', payload: res.data?.devOtp || null });
      dispatch({ type: 'SET_STEP', payload: 2 });
      if (res.data?.devOtp) {
        toast.success(`Dev OTP: ${res.data.devOtp}`, { duration: 7000 });
      } else {
        toast.success('OTP sent successfully!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.tag}>Step 01 — Identity Verification</div>
      <h1 className={styles.title}>Enter your mobile number</h1>
      <p className={styles.desc}>
        Your phone is used only for one-time authentication and is never linked to your vote on the blockchain.
      </p>

      <div className={styles.notice} data-type="info">
        <span className={styles.noticeIcon}>ℹ</span>
        <span>Anonymous tokenization decouples your identity from your vote before it reaches the blockchain.</span>
      </div>

      <div className={styles.inputWrap}>
        <span className={styles.prefix}>+91</span>
        <input
          className={styles.field}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="98XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          autoFocus
        />
      </div>

      <button className={styles.btnPrimary} onClick={handleSend} disabled={loading}>
        {loading ? <><span className={styles.spinner} /> Sending OTP...</> : 'Send OTP via SMS'}
      </button>

      <div className={styles.securityBadges}>
        <span className={styles.badge}><span className={styles.badgeIcon}>🔒</span> End-to-end encrypted</span>
        <span className={styles.badge}><span className={styles.badgeIcon}>🛡</span> Zero knowledge</span>
        <span className={styles.badge}><span className={styles.badgeIcon}>⛓</span> Ethereum blockchain</span>
      </div>
    </div>
  );
}
