import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useVote } from '../context/VoteContext';
import { getCandidates } from '../utils/api';
import styles from './Steps.module.css';

export default function CandidateStep() {
  const { state, dispatch } = useVote();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCandidates();
        dispatch({ type: 'SET_CANDIDATES', payload: res.data.data });
      } catch {
        toast.error('Failed to load candidates');
      }
    };
    fetch();
  }, [dispatch]);

  const select = (c) => dispatch({ type: 'SELECT_CANDIDATE', payload: c });

  const tokenShort = state.votingToken
    ? state.votingToken.slice(0, 20) + '...' + state.votingToken.slice(-8)
    : 'Generating...';

  return (
    <div className={styles.screen}>
      <div className={styles.tag}>Step 03 — Cast Your Vote</div>
      <h1 className={styles.title}>Select a candidate</h1>
      <p className={styles.desc}>Your anonymous token has been generated. Select one candidate to proceed.</p>

      <div className={styles.tokenBox}>
        <div className={styles.tokenLabel}>ANONYMOUS VOTING TOKEN</div>
        <div className={styles.tokenVal}>{tokenShort}</div>
        <div className={styles.tokenNote}>This token will be hashed and submitted to the smart contract</div>
      </div>

      <div className={styles.candidateGrid}>
        {state.candidates.map((c) => {
          const isSelected = state.selectedCandidate?.candidateId === c.candidateId;
          return (
            <div
              key={c.candidateId}
              className={`${styles.candidateCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => select(c)}
              style={{ '--c-color': c.color }}
            >
              <div className={styles.avatar} style={{ background: `${c.color}20`, color: c.color }}>
                {c.initials}
              </div>
              <div className={styles.candidateInfo}>
                <div className={styles.candidateName}>{c.name}</div>
                <div className={styles.candidateParty}>{c.party}</div>
                <div className={styles.candidateId}>ID: {c.candidateId}</div>
                {c.manifesto && (
                  <div className={styles.manifesto}>{c.manifesto}</div>
                )}
              </div>
              <div className={`${styles.radio} ${isSelected ? styles.radioSelected : ''}`} style={isSelected ? { background: c.color, borderColor: c.color } : {}}>
                <div className={styles.radioInner} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={styles.btnPrimary}
        onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}
        disabled={!state.selectedCandidate}
      >
        Review my vote →
      </button>
    </div>
  );
}
