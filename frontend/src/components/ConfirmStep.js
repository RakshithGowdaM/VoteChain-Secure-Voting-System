import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useVote } from '../context/VoteContext';
import { castVote } from '../utils/api';
import styles from './Steps.module.css';

const CHAIN_STEPS = [
  'Validating token on smart contract...',
  'Signing transaction with private key...',
  'Broadcasting to Ethereum nodes...',
  'Awaiting block confirmation...',
  'Vote permanently recorded!',
];

export default function ConfirmStep() {
  const { state, dispatch } = useVote();
  const [submitting, setSubmitting] = useState(false);
  const [chainStep, setChainStep] = useState(0);
  const c = state.selectedCandidate;

  const handleSubmit = async () => {
    setSubmitting(true);
    let si = 0;
    const iv = setInterval(() => {
      si++;
      setChainStep(si);
      if (si >= CHAIN_STEPS.length - 1) clearInterval(iv);
    }, 800);

    try {
      const res = await castVote(c.candidateId);
      const txHash = res.data?.data?.transactionHash;
      if (txHash) {
        localStorage.setItem('votechain_last_tx_hash', txHash);
      }
      clearInterval(iv);
      setChainStep(CHAIN_STEPS.length - 1);
      setTimeout(() => {
        dispatch({ type: 'SET_TX_RESULT', payload: res.data.data });
        dispatch({ type: 'SET_STEP', payload: 5 });
      }, 600);
    } catch (err) {
      clearInterval(iv);
      setSubmitting(false);
      setChainStep(0);
      const msg = err.response?.data?.message || 'Transaction failed';
      toast.error(msg);
    }
  };

  const tokenShort = state.votingToken
    ? state.votingToken.slice(0, 22) + '...'
    : '...';

  if (submitting) {
    return (
      <div className={styles.screen}>
        <div className={styles.loadingCenter}>
          <div className={styles.chainAnim}>
            {[0,1,2,3].map(i => (
              <div key={i} className={styles.chainNode} style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
            {[0,1,2].map(i => (
              <div key={`l${i}`} className={styles.chainLink} style={{ left: `calc(${20 + i * 22}% + 14px)`, width: 'calc(22% - 14px)' }} />
            ))}
          </div>
          <div className={styles.loadingTitle}>Broadcasting to blockchain...</div>
          <div className={styles.loadingStep}>{CHAIN_STEPS[chainStep]}</div>
          <div className={styles.chainStepList}>
            {CHAIN_STEPS.map((s, i) => (
              <div key={i} className={`${styles.chainStepItem} ${i < chainStep ? styles.done : ''} ${i === chainStep ? styles.current : ''}`}>
                <span className={styles.stepDot}>{i < chainStep ? '✓' : i === chainStep ? '→' : '○'}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.tag}>Step 04 — Review & Submit</div>
      <h1 className={styles.title}>Confirm your vote</h1>
      <p className={styles.desc}>Once submitted, your vote is permanently recorded on the blockchain and cannot be changed.</p>

      <div className={styles.notice} data-type="warn">
        <span className={styles.noticeIcon}>⚠</span>
        <span>This action is irreversible. Your token will be marked as used after submission.</span>
      </div>

      <div className={styles.confirmCard}>
        {[
          ['CANDIDATE ID', c?.candidateId, 'blue'],
          ['CANDIDATE NAME', c?.name, ''],
          ['PARTY', c?.party, ''],
          ['VOTING TOKEN', tokenShort, 'green'],
          ['NETWORK', 'Ethereum Mainnet', ''],
          ['SMART CONTRACT', '0xVote...3f9a', 'blue'],
          ['TIMESTAMP', new Date().toISOString(), ''],
        ].map(([key, val, color]) => (
          <div key={key} className={styles.confirmRow}>
            <span className={styles.confirmKey}>{key}</span>
            <span className={`${styles.confirmVal} ${color === 'blue' ? styles.blue : color === 'green' ? styles.green : ''}`}>{val}</span>
          </div>
        ))}
      </div>

      <button className={styles.btnPrimary} onClick={handleSubmit}>
        Submit to Blockchain ⛓
      </button>
      <button className={styles.btnGhost} onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
        ← Change selection
      </button>
    </div>
  );
}
