import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVote } from '../context/VoteContext';
import styles from './Steps.module.css';

export default function SuccessStep() {
  const { state, dispatch } = useVote();
  const navigate = useNavigate();
  const tx = state.txResult || {};

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      dispatch({ type: 'RESET' });
      navigate('/', { replace: true });
    }, 5000);

    return () => clearTimeout(resetTimer);
  }, [dispatch, navigate]);

  return (
    <div className={styles.screen}>
      <div className={styles.successCenter}>
        <div className={styles.successIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className={styles.successTitle}>Vote Recorded!</h1>
        <p className={styles.successDesc}>
          Your vote has been permanently stored on the Ethereum blockchain. It is now tamper-proof, transparent, and immutable.
        </p>

        <div className={styles.txCard}>
          <div className={styles.txLabel}>TRANSACTION HASH</div>
          <div className={styles.txHash}>{tx.transactionHash || 'N/A'}</div>
          <div className={styles.txStats}>
            <div className={styles.txStat}>
              <div className={styles.txStatLabel}>STATUS</div>
              <div className={`${styles.txStatVal} ${styles.green}`}>Confirmed</div>
            </div>
            <div className={styles.txStat}>
              <div className={styles.txStatLabel}>BLOCK</div>
              <div className={`${styles.txStatVal} ${styles.blue}`}>#{tx.blockNumber?.toLocaleString() || '—'}</div>
            </div>
            <div className={styles.txStat}>
              <div className={styles.txStatLabel}>GAS USED</div>
              <div className={`${styles.txStatVal} ${styles.amber}`}>{parseInt(tx.gasUsed || 0).toLocaleString()}</div>
            </div>
            <div className={styles.txStat}>
              <div className={styles.txStatLabel}>CANDIDATE</div>
              <div className={styles.txStatVal}>{tx.candidateName || state.selectedCandidate?.name}</div>
            </div>
          </div>
        </div>

        <div className={styles.notice} data-type="success">
          <span className={styles.noticeIcon}>✓</span>
          <span>Your token is permanently marked as used. Duplicate voting is prevented by the smart contract.</span>
        </div>

        <button
          className={styles.btnGhost}
          onClick={() => navigate('/verify')}
        >
          Verify your vote →
        </button>
      </div>
    </div>
  );
}
