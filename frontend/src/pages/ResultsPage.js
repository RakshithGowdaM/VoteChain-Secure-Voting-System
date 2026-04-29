import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getResults } from '../utils/api';
import styles from './ResultsPage.module.css';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPublished, setIsPublished] = useState(true);
  const [publishAt, setPublishAt] = useState(null);
  const [serverMessage, setServerMessage] = useState('');
  const [countdown, setCountdown] = useState('');

  const fetchResults = async () => {
    try {
      const res = await getResults();
      setIsPublished(Boolean(res.data.isPublished));
      setPublishAt(res.data.publishAt || null);
      setServerMessage(res.data.message || '');
      setResults(res.data.data);
      setTotalVotes(res.data.totalVotes);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const iv = setInterval(fetchResults, 15000); // auto-refresh every 15s
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!publishAt || isPublished) {
      setCountdown('');
      return;
    }

    const target = new Date(publishAt);
    const tick = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('00:00:00');
        fetchResults();
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n) => String(n).padStart(2, '0');
      setCountdown(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [publishAt, isPublished]);

  const hasLeader = totalVotes > 0 && results.length > 0;
  const maxVoteCount = hasLeader ? Math.max(...results.map((r) => r.voteCount)) : 0;
  const leadingCandidates = hasLeader
    ? results.filter((r) => r.voteCount === maxVoteCount)
    : [];
  const isTieForLead = leadingCandidates.length > 1;
  const leaderDisplayName = hasLeader
    ? leadingCandidates.map((c) => c.name).join(', ')
    : 'No votes yet';
  const leaderDisplayColor = hasLeader
    ? (isTieForLead ? 'var(--accent2)' : leadingCandidates[0]?.color)
    : undefined;
  const sortedResults = [...results].sort((a, b) => b.voteCount - a.voteCount);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <div className={styles.tooltipName}>{d.name}</div>
          <div className={styles.tooltipParty}>{d.party}</div>
          <div className={styles.tooltipVotes}>{d.voteCount.toLocaleString()} votes ({d.percentage}%)</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.tag}>Live Results</div>
        <h1 className={styles.title}>
          {process.env.REACT_APP_ELECTION_NAME || 'General Election 2025'}
        </h1>
        <p className={styles.sub}>
          Results are tallied directly from the Ethereum smart contract in real time.
        </p>
        {lastUpdated && (
          <div className={styles.updated}>
            Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 15s
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span>Fetching blockchain data...</span>
        </div>
      ) : !isPublished ? (
        <div className={styles.lockCard}>
          <div className={styles.lockTitle}>Results Are Locked</div>
          <div className={styles.lockText}>
            {serverMessage || 'Votes will be displayed at the mentioned time set by admin.'}
          </div>
          {publishAt ? (
            <>
              <div className={styles.lockMeta}>Publish Time: {new Date(publishAt).toLocaleString()}</div>
              <div className={styles.countdownBox}>{countdown || '--:--:--'}</div>
            </>
          ) : (
            <div className={styles.lockMeta}>Publish time is not set yet by admin.</div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Votes Cast</div>
              <div className={styles.statValue}>{totalVotes.toLocaleString()}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Candidates</div>
              <div className={styles.statValue}>{results.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>{isTieForLead ? 'Current Leaders' : 'Current Leader'}</div>
              <div className={styles.statValue} style={{ color: leaderDisplayColor }}>
                {leaderDisplayName}
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Vote Distribution</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={results} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.08)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'Syne' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="voteCount" radius={[6, 6, 0, 0]}>
                  {results.map((r, i) => <Cell key={i} fill={r.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.candidateList}>
            {sortedResults
              .map((c, i) => (
                <div key={c.candidateId} className={styles.candidateRow}>
                  <div className={styles.rank} style={{ color: hasLeader && c.voteCount === maxVoteCount ? '#f59e0b' : 'var(--text3)' }}>
                    #{i + 1}
                  </div>
                  <div className={styles.avatar} style={{ background: `${c.color}20`, color: c.color }}>
                    {c.initials}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.name}>{c.name}</div>
                    <div className={styles.party}>{c.party}</div>
                  </div>
                  <div className={styles.barWrap}>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${c.percentage}%`, background: c.color }}
                      />
                    </div>
                    <div className={styles.pct}>{c.percentage}%</div>
                  </div>
                  <div className={styles.votes}>{c.voteCount.toLocaleString()}</div>
                </div>
              ))}
          </div>

          <div className={styles.footer}>
            <span className={styles.footerNote}>
              All votes are recorded on-chain. Results are publicly verifiable at any time.
            </span>
            <button className={styles.refreshBtn} onClick={fetchResults}>
              Refresh now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
