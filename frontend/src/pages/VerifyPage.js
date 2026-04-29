import React, { useEffect, useState } from 'react';
import { verifyTransaction } from '../utils/api';
import styles from './VerifyPage.module.css';

export default function VerifyPage() {
  const [txHash, setTxHash] = useState('');
  const [lastTxHash, setLastTxHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('votechain_last_tx_hash') || '';
    setLastTxHash(saved);
  }, []);

  const normalizeHashQuery = (value) => {
    return value
      .trim()
      .replace(/\u2026/g, '...')
      .replace(/\s*\.\.\.\s*/g, '...')
      .replace(/\s+/g, '');
  };

  const handleVerify = async () => {
    const query = normalizeHashQuery(txHash);
    if (!query) { setError('Enter a transaction hash'); return; }

    // Accept either full hash (0x + 64 hex) or abbreviated format (e.g. 0xabc...7890)
    const fullHashPattern = /^0x[a-fA-F0-9]{64}$/;
    const shortHashPattern = /^0x[a-fA-F0-9]{6,}\.\.\.[a-fA-F0-9]{4,}$/;
    if (!fullHashPattern.test(query) && !shortHashPattern.test(query)) {
      setError('Enter a full hash (0x + 64 hex) or abbreviated format like 0xabc123...def456');
      return;
    }

    setLoading(true); setError(''); setResult(null);
    try {
      const res = await verifyTransaction(query);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.tag}>Public Verification</div>
      <h1 className={styles.title}>Verify a vote</h1>
      <p className={styles.desc}>
        Enter a transaction hash to verify that a vote was correctly recorded on the blockchain.
        This is a public, trustless verification.
      </p>

      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="0xabc123...def456 or full 0x hash"
          value={txHash}
          onChange={e => setTxHash(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
        />
        <button className={styles.searchBtn} onClick={handleVerify} disabled={loading}>
          {loading ? 'Searching...' : 'Verify →'}
        </button>
      </div>

      {!!lastTxHash && (
        <div className={styles.lastHashRow}>
          <span className={styles.lastHashText}>Last vote hash: {lastTxHash.slice(0, 12)}...{lastTxHash.slice(-10)}</span>
          <button
            className={styles.lastHashBtn}
            onClick={() => {
              setTxHash(lastTxHash);
              setError('');
            }}
          >
            Use last hash
          </button>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span>✗</span> {error}
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div className={styles.checkIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className={styles.resultTitle}>Vote Verified</div>
              <div className={styles.resultSub}>This transaction is confirmed on the blockchain</div>
            </div>
          </div>
          <div className={styles.resultRows}>
            {[
              ['Transaction Hash', result.transactionHash],
              ['Block Number', `#${result.blockNumber?.toLocaleString()}`],
              ['Status', result.status],
              ['Candidate ID', result.candidateId],
              ['Timestamp', new Date(result.timestamp).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className={styles.resultRow}>
                <span className={styles.resultKey}>{k}</span>
                <span className={styles.resultVal}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.howWrap}>
        <div className={styles.howTitle}>How verification works</div>
        <div className={styles.howSteps}>
          {[
            ['1', 'Every vote generates a unique transaction hash when submitted to the smart contract.'],
            ['2', 'The transaction hash is returned to the voter as a receipt after casting their vote.'],
            ['3', 'Anyone can enter that hash here to confirm the vote is recorded on the public blockchain.'],
            ['4', 'The voter\'s identity is never revealed — only the candidate ID and timestamp are public.'],
          ].map(([n, text]) => (
            <div key={n} className={styles.howStep}>
              <div className={styles.howNum}>{n}</div>
              <div className={styles.howText}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
