import React, { useState, useEffect } from 'react';
import {
  adminLogin,
  getAdminDashboard,
  getAdminVotes,
  getAdminVoters,
  getAdminCandidates,
  createAdminCandidate,
  removeAdminCandidate,
  getAdminResultSettings,
  updateAdminResultSettings,
  getAdminElectionWindow,
  updateAdminElectionWindow,
  setAdminVotingLock,
  endAdminElection,
  exportAdminDataCsv,
  clearAllAdminData,
} from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('votechain_admin_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [votes, setVotes] = useState([]);
  const [voters, setVoters] = useState([]);
  const [adminCandidates, setAdminCandidates] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateErr, setCandidateErr] = useState('');
  const [candidateMsg, setCandidateMsg] = useState('');
  const [expectedVoters, setExpectedVoters] = useState(() => localStorage.getItem('votechain_expected_voters') || '');
  const [voterSearch, setVoterSearch] = useState('');
  const [resultDate, setResultDate] = useState('');
  const [resultClock, setResultClock] = useState('');
  const [resultTimeSaving, setResultTimeSaving] = useState(false);
  const [resultTimeMsg, setResultTimeMsg] = useState('');
  const [resultTimeErr, setResultTimeErr] = useState('');
  const [electionStartDate, setElectionStartDate] = useState('');
  const [electionStartClock, setElectionStartClock] = useState('');
  const [electionEndDate, setElectionEndDate] = useState('');
  const [electionEndClock, setElectionEndClock] = useState('');
  const [electionWindowSaving, setElectionWindowSaving] = useState(false);
  const [electionWindowMsg, setElectionWindowMsg] = useState('');
  const [electionWindowErr, setElectionWindowErr] = useState('');
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMsg, setClearMsg] = useState('');
  const [clearErr, setClearErr] = useState('');
  const [votingLocked, setVotingLocked] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    candidateId: '',
    name: '',
    party: '',
    initials: '',
    color: '#3b82f6',
    manifesto: '',
  });

  const handleLogin = async () => {
    setLoginLoading(true); setLoginErr('');
    try {
      const user = username.trim();
      const pass = password.trim();
      const res = await adminLogin(user, pass);
      const t = res.data.token;
      localStorage.setItem('votechain_admin_token', t);
      localStorage.setItem('votechain_auth_token', t);
      setToken(t);
    } catch (err) {
      setLoginErr(err.response?.data?.message || 'Login failed. Check API URL/CORS and backend env credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('votechain_admin_token');
    localStorage.removeItem('votechain_auth_token');
    setToken('');
    setDashboard(null);
    setAdminCandidates([]);
  };

  const fetchAdminCandidates = async () => {
    const res = await getAdminCandidates();
    setAdminCandidates(res.data.data || []);
  };

  const refreshDashboard = async () => {
    const dashRes = await getAdminDashboard();
    setDashboard(dashRes.data.data);
  };

  const expectedVotersNumber = Number.parseInt(expectedVoters, 10);
  const hasExpectedVoters = Number.isFinite(expectedVotersNumber) && expectedVotersNumber > 0;
  const totalVoters = dashboard?.totalVoters || 0;
  const computedPendingVoters = hasExpectedVoters
    ? Math.max(expectedVotersNumber - totalVoters, 0)
    : (dashboard?.pendingVotes || 0);
  const pendingVotersExceeded = hasExpectedVoters && totalVoters > expectedVotersNumber;

  const splitDateAndTime = (value) => {
    if (!value) return { date: '', time: '' };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: '', time: '' };
    const pad = (n) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  };

  const handleSaveResultTime = async () => {
    setResultTimeErr('');
    setResultTimeMsg('');
    if (!resultDate || !resultClock) {
      setResultTimeErr('Please choose both date and time.');
      return;
    }

    const combined = `${resultDate}T${resultClock}`;
    const parsed = new Date(combined);
    if (Number.isNaN(parsed.getTime())) {
      setResultTimeErr('Invalid date/time selected.');
      return;
    }

    setResultTimeSaving(true);
    try {
      await updateAdminResultSettings(parsed.toISOString());
      setResultTimeMsg('Result publish time saved successfully.');
      await refreshDashboard();
    } catch (err) {
      setResultTimeErr(err.response?.data?.message || 'Failed to save result publish time');
    } finally {
      setResultTimeSaving(false);
    }
  };

  const handleExpectedVotersChange = (value) => {
    const cleaned = value.replace(/[^\d]/g, '');
    setExpectedVoters(cleaned);
    localStorage.setItem('votechain_expected_voters', cleaned);
  };

  const handleSaveElectionWindow = async () => {
    setElectionWindowErr('');
    setElectionWindowMsg('');

    if (!electionStartDate || !electionStartClock || !electionEndDate || !electionEndClock) {
      setElectionWindowErr('Please choose start and end date/time.');
      return;
    }

    const start = new Date(`${electionStartDate}T${electionStartClock}`);
    const end = new Date(`${electionEndDate}T${electionEndClock}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setElectionWindowErr('Invalid start or end date/time.');
      return;
    }

    if (end <= start) {
      setElectionWindowErr('Election end time must be after election start time.');
      return;
    }

    setElectionWindowSaving(true);
    try {
      await updateAdminElectionWindow(start.toISOString(), end.toISOString());
      setElectionWindowMsg('Election window saved successfully.');
      await refreshDashboard();
    } catch (err) {
      setElectionWindowErr(err.response?.data?.message || 'Failed to save election window');
    } finally {
      setElectionWindowSaving(false);
    }
  };

  const handleClearAllData = async () => {
    setClearErr('');
    setClearMsg('');

    if (clearConfirm.trim() !== 'CLEAR') {
      setClearErr('Type CLEAR to confirm data wipe.');
      return;
    }

    setClearLoading(true);
    try {
      await clearAllAdminData();
      setClearMsg('All election data cleared successfully.');
      setClearConfirm('');
      setExpectedVoters('');
      localStorage.removeItem('votechain_expected_voters');
      setVoters([]);
      setVotes([]);
      setAdminCandidates([]);
      await Promise.all([refreshDashboard(), fetchAdminCandidates()]);
      const settingsRes = await getAdminResultSettings();
      const split = splitDateAndTime(settingsRes.data?.data?.publishAt);
      setResultDate(split.date);
      setResultClock(split.time);
      setElectionStartDate('');
      setElectionStartClock('');
      setElectionEndDate('');
      setElectionEndClock('');
    } catch (err) {
      setClearErr(err.response?.data?.message || 'Failed to clear all data');
    } finally {
      setClearLoading(false);
    }
  };

  const handleToggleVotingLock = async () => {
    setLockLoading(true);
    try {
      await setAdminVotingLock(!votingLocked);
      setVotingLocked(!votingLocked);
      await refreshDashboard();
    } catch (err) {
      console.error('Failed to toggle voting lock:', err);
    } finally {
      setLockLoading(false);
    }
  };

  const handleEndElection = async () => {
    if (!window.confirm('Are you sure you want to end the election? This action cannot be undone.')) {
      return;
    }
    setEndLoading(true);
    try {
      await endAdminElection();
      setElectionEnded(true);
      await refreshDashboard();
    } catch (err) {
      console.error('Failed to end election:', err);
    } finally {
      setEndLoading(false);
    }
  };

  const handleExportData = async (type) => {
    setExportLoading(true);
    try {
      const response = await exportAdminDataCsv(type);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `election-${type}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Failed to export data:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    setCandidateErr('');
    setCandidateMsg('');
    setCandidateLoading(true);

    try {
      const payload = {
        ...candidateForm,
        initials: candidateForm.initials || candidateForm.name.slice(0, 2).toUpperCase(),
      };

      await createAdminCandidate(payload);
      setCandidateMsg('Candidate added successfully.');
      setCandidateForm({
        candidateId: '',
        name: '',
        party: '',
        initials: '',
        color: '#3b82f6',
        manifesto: '',
      });
      await Promise.all([refreshDashboard(), fetchAdminCandidates()]);
    } catch (err) {
      setCandidateErr(err.response?.data?.message || 'Failed to add candidate');
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleRemoveCandidate = async (candidateId) => {
    setCandidateErr('');
    setCandidateMsg('');
    setCandidateLoading(true);

    try {
      await removeAdminCandidate(candidateId);
      setCandidateMsg(`Candidate ${candidateId} removed.`);
      await Promise.all([refreshDashboard(), fetchAdminCandidates()]);
    } catch (err) {
      setCandidateErr(err.response?.data?.message || 'Failed to remove candidate');
    } finally {
      setCandidateLoading(false);
    }
  };

  const filteredVoters = voters.filter((v) => {
    if (!voterSearch.trim()) return true;
    return v.id.toLowerCase().includes(voterSearch.trim().toLowerCase());
  });

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      if (!dashboard) setLoading(true);
      setLoadErr('');
      try {
        const dashRes = await getAdminDashboard();
        const d = dashRes.data.data;
        setDashboard(d);
        setVotingLocked(d.votingLocked || false);
        setElectionEnded(d.electionEnded || false);
        if (tab === 'overview') {
          const settingsRes = await getAdminResultSettings();
          const split = splitDateAndTime(settingsRes.data?.data?.publishAt);
          setResultDate(split.date);
          setResultClock(split.time);
        }
        if (tab === 'admin-actions') {
          const electionWindowRes = await getAdminElectionWindow();
          const startSplit = splitDateAndTime(electionWindowRes.data?.data?.electionStartAt);
          const endSplit = splitDateAndTime(electionWindowRes.data?.data?.electionEndAt);
          setElectionStartDate(startSplit.date);
          setElectionStartClock(startSplit.time);
          setElectionEndDate(endSplit.date);
          setElectionEndClock(endSplit.time);
        }
        // Only load full votes list if on votes tab
        if (tab === 'votes') {
          const votesRes = await getAdminVotes();
          setVotes(votesRes.data.data);
        }
        if (tab === 'voters') {
          const votersRes = await getAdminVoters();
          setVoters(votersRes.data.data || []);
        }
        if (tab === 'candidates') {
          await fetchAdminCandidates();
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          handleLogout();
          return;
        }
        setLoadErr(err.response?.data?.message || 'Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [token, tab]);

  if (!token) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className={styles.loginTitle}>Admin Access</h2>
          <p className={styles.loginSub}>VoteChain Election Management</p>
          <input className={styles.loginInput} type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className={styles.loginInput} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {loginErr && <div className={styles.loginErr}>{loginErr}</div>}
          <button className={styles.loginBtn} onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign In →'}
          </button>
          <div className={styles.loginHint}>Default: admin / votechain2025</div>
        </div>
      </div>
    );
  }

  if (loading || !dashboard) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>{loadErr || 'Loading dashboard...'}</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div>
          <div className={styles.tag}>Admin Dashboard</div>
          <h1 className={styles.title}>{dashboard.electionName}</h1>
        </div>
        <div className={styles.topActions}>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {['overview', 'votes', 'voters', 'candidates', 'admin-actions'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t === 'admin-actions' ? 'Admin Actions' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'admin-actions' && (
        <div>
          <div className={styles.publishCard}>
            <div className={styles.publishHead}>Election Window Control</div>
            <div className={styles.publishSub}>
              Schedule exactly when voting should start and end.
            </div>
            <div className={styles.expectedRow}>
              <div className={styles.actionLabel}>Start Time</div>
              <div className={styles.publishRow}>
                <input
                  className={styles.publishInput}
                  type="date"
                  value={electionStartDate}
                  onChange={(e) => setElectionStartDate(e.target.value)}
                />
                <input
                  className={styles.publishInput}
                  type="time"
                  value={electionStartClock}
                  onChange={(e) => setElectionStartClock(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.expectedRow}>
              <div className={styles.actionLabel}>End Time</div>
              <div className={styles.publishRow}>
                <input
                  className={styles.publishInput}
                  type="date"
                  value={electionEndDate}
                  onChange={(e) => setElectionEndDate(e.target.value)}
                />
                <input
                  className={styles.publishInput}
                  type="time"
                  value={electionEndClock}
                  onChange={(e) => setElectionEndClock(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.publishRow}>
              <button
                className={styles.publishBtn}
                onClick={handleSaveElectionWindow}
                disabled={electionWindowSaving}
              >
                {electionWindowSaving ? 'Saving...' : 'Set Election Window'}
              </button>
            </div>
            {dashboard.electionStartAt && dashboard.electionEndAt && (
              <div className={styles.publishMeta}>
                Active schedule: {new Date(dashboard.electionStartAt).toLocaleString()} → {new Date(dashboard.electionEndAt).toLocaleString()}
              </div>
            )}
            {electionWindowErr && <div className={styles.formErr}>{electionWindowErr}</div>}
            {electionWindowMsg && <div className={styles.formMsg}>{electionWindowMsg}</div>}
          </div>

          <div className={styles.actionsCard}>
            <div className={styles.actionsHead}>Admin Actions</div>
            <div className={styles.actionsGrid}>
              <div className={styles.actionBlock}>
                <div className={styles.actionLabel}>Voting Control</div>
                <button
                  className={`${styles.actionBtn} ${votingLocked ? styles.dangerous : ''}`}
                  onClick={handleToggleVotingLock}
                  disabled={lockLoading}
                >
                  {lockLoading ? 'Updating...' : votingLocked ? 'Voting Locked' : 'Lock Voting'}
                </button>
              </div>
              <div className={styles.actionBlock}>
                <div className={styles.actionLabel}>Election Control</div>
                <button
                  className={`${styles.actionBtn} ${electionEnded ? styles.dangerous : ''}`}
                  onClick={handleEndElection}
                  disabled={endLoading || electionEnded}
                >
                  {endLoading ? 'Ending...' : electionEnded ? 'Election Ended' : 'End Election'}
                </button>
              </div>
              <div className={styles.actionBlock}>
                <div className={styles.actionLabel}>Export Data</div>
                <div className={styles.exportButtons}>
                  <button
                    className={styles.exportBtn}
                    onClick={() => handleExportData('votes')}
                    disabled={exportLoading}
                  >
                    Votes
                  </button>
                  <button
                    className={styles.exportBtn}
                    onClick={() => handleExportData('voters')}
                    disabled={exportLoading}
                  >
                    Voters
                  </button>
                  <button
                    className={styles.exportBtn}
                    onClick={() => handleExportData('candidates')}
                    disabled={exportLoading}
                  >
                    Candidates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div>
          <div className={styles.publishCard}>
            <div className={styles.publishHead}>Result Publish Control</div>
            <div className={styles.publishSub}>
              Results page will remain hidden until this time.
            </div>
            <div className={styles.expectedRow}>
              <input
                className={styles.publishInput}
                type="text"
                inputMode="numeric"
                placeholder="Expected number of voters"
                value={expectedVoters}
                onChange={(e) => handleExpectedVotersChange(e.target.value)}
              />
            </div>
            <div className={styles.publishRow}>
              <input
                className={styles.publishInput}
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
              />
              <input
                className={styles.publishInput}
                type="time"
                value={resultClock}
                onChange={(e) => setResultClock(e.target.value)}
              />
              <button
                className={styles.publishBtn}
                onClick={handleSaveResultTime}
                disabled={resultTimeSaving}
              >
                {resultTimeSaving ? 'Saving...' : 'Set Result Time'}
              </button>
            </div>
            {dashboard.resultPublishAt && (
              <div className={styles.publishMeta}>
                Scheduled: {new Date(dashboard.resultPublishAt).toLocaleString()}
              </div>
            )}
            {hasExpectedVoters && (
              <div className={styles.publishMeta}>
                Expected voters: {expectedVotersNumber.toLocaleString()} · Pending voters: {computedPendingVoters.toLocaleString()}
              </div>
            )}
            {pendingVotersExceeded && (
              <div className={styles.warnBox}>
                Actual voters have exceeded the expected voter count. Please review the election settings.
              </div>
            )}
            {resultTimeErr && <div className={styles.formErr}>{resultTimeErr}</div>}
            {resultTimeMsg && <div className={styles.formMsg}>{resultTimeMsg}</div>}
          </div>

          <div className={styles.dangerCard}>
            <div className={styles.dangerHead}>Danger Zone</div>
            <div className={styles.dangerSub}>
              Clear all election data (votes, voters, OTP records, candidates, and result publish time).
            </div>
            <div className={styles.dangerRow}>
              <input
                className={styles.dangerInput}
                type="text"
                placeholder="Type CLEAR to confirm"
                value={clearConfirm}
                onChange={(e) => setClearConfirm(e.target.value)}
              />
              <button
                className={styles.dangerBtn}
                onClick={handleClearAllData}
                disabled={clearLoading}
              >
                {clearLoading ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
            {clearErr && <div className={styles.formErr}>{clearErr}</div>}
            {clearMsg && <div className={styles.formMsg}>{clearMsg}</div>}
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Voters</div>
              <div className={styles.statValue}>{dashboard.totalVoters.toLocaleString()}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Pending Voters</div>
              <div className={`${styles.statValue} ${styles.amber}`}>{computedPendingVoters}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Leading Candidate</div>
              <div className={styles.statValue} style={{ color: dashboard.leading?.color, fontSize: '18px' }}>
                {dashboard.leading?.name || '—'}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Lead Margin</div>
              <div className={`${styles.statValue} ${styles.green}`}>{dashboard.leading?.percentage || 0}%</div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Vote Distribution</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboard.candidates} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{ background: '#161b28', border: '0.5px solid rgba(99,179,237,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                  itemStyle={{ color: '#60a5fa', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                />
                <Bar dataKey="voteCount" radius={[6,6,0,0]}>
                  {dashboard.candidates.map((c, i) => <Cell key={i} fill={c.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.sectionTitle}>Candidate Standings</div>
          <div className={styles.standingsList}>
            {[...dashboard.candidates].sort((a,b) => b.voteCount - a.voteCount).map((c, i) => (
              <div key={c.candidateId} className={styles.standingRow}>
                <div className={styles.standingRank} style={{ color: i === 0 ? '#f59e0b' : 'var(--text3)' }}>#{i+1}</div>
                <div className={styles.standingAvatar} style={{ background: `${c.color}20`, color: c.color }}>{c.initials || c.name.slice(0,2)}</div>
                <div className={styles.standingInfo}>
                  <div className={styles.standingName}>{c.name}</div>
                  <div className={styles.standingParty}>{c.party}</div>
                </div>
                <div className={styles.standingBar}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${c.percentage}%`, background: c.color }} />
                  </div>
                  <span className={styles.barPct}>{c.percentage}%</span>
                </div>
                <div className={styles.standingVotes}>{c.voteCount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'votes' && (
        <div>
          <div className={styles.sectionTitle}>Recent Transactions</div>
          <div className={styles.voteTable}>
            <div className={styles.tableHeader}>
              <span>Tx Hash</span>
              <span>Candidate</span>
              <span>Block</span>
              <span>Status</span>
              <span>Time</span>
            </div>
            {votes.map(v => (
              <div key={v._id} className={styles.tableRow}>
                <span className={styles.txHash}>{v.transactionHash?.slice(0,14)}...</span>
                <span className={styles.mono}>{v.candidateId}</span>
                <span className={styles.mono}>#{v.blockNumber?.toLocaleString() || '—'}</span>
                <span className={`${styles.statusPill} ${v.status === 'confirmed' ? styles.confirmed : v.status === 'pending' ? styles.pending : styles.failed}`}>{v.status}</span>
                <span className={styles.mono}>{new Date(v.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
            {votes.length === 0 && <div className={styles.empty}>No votes recorded yet</div>}
          </div>
        </div>
      )}

      {tab === 'voters' && (
        <div>
          <div className={styles.sectionTitle}>Voter Registry</div>
          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search masked voter ID"
              value={voterSearch}
              onChange={(e) => setVoterSearch(e.target.value)}
            />
          </div>
          <div className={styles.voteTable}>
            <div className={styles.tableHeader} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <span>Masked Voter ID</span>
              <span>Status</span>
              <span>Time</span>
            </div>
            {filteredVoters.map(v => (
              <div key={v.id} className={styles.tableRow} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <span className={styles.txHash}>{v.id}</span>
                <span className={`${styles.statusPill} ${styles.confirmed}`}>Voted</span>
                <span className={styles.mono}>{new Date(v.votedAt).toLocaleString()}</span>
              </div>
            ))}
            {filteredVoters.length === 0 && <div className={styles.empty}>No voters match your search</div>}
          </div>
        </div>
      )}

      {tab === 'candidates' && (
        <div>
          <div className={styles.sectionTitle}>Candidate Registry</div>
          <form className={styles.candidateForm} onSubmit={handleCreateCandidate}>
            <input
              className={styles.formInput}
              placeholder="Candidate ID (e.g. C005)"
              value={candidateForm.candidateId}
              onChange={(e) => setCandidateForm({ ...candidateForm, candidateId: e.target.value })}
              required
            />
            <input
              className={styles.formInput}
              placeholder="Candidate Name"
              value={candidateForm.name}
              onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
              required
            />
            <input
              className={styles.formInput}
              placeholder="Party"
              value={candidateForm.party}
              onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
              required
            />
            <input
              className={styles.formInput}
              placeholder="Initials (optional)"
              value={candidateForm.initials}
              onChange={(e) => setCandidateForm({ ...candidateForm, initials: e.target.value.toUpperCase() })}
            />
            <input
              className={styles.formInput}
              type="color"
              value={candidateForm.color}
              onChange={(e) => setCandidateForm({ ...candidateForm, color: e.target.value })}
            />
            <input
              className={styles.formInput}
              placeholder="Manifesto (optional)"
              value={candidateForm.manifesto}
              onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
            />
            <button className={styles.addBtn} type="submit" disabled={candidateLoading}>
              {candidateLoading ? 'Saving...' : 'Add Candidate'}
            </button>
          </form>

          {candidateErr && <div className={styles.formErr}>{candidateErr}</div>}
          {candidateMsg && <div className={styles.formMsg}>{candidateMsg}</div>}

          <div className={styles.candidateCards}>
            {adminCandidates.map(c => (
              <div key={c.candidateId} className={styles.candidateCard} style={{ borderColor: `${c.color}40` }}>
                <div className={styles.cAvatar} style={{ background: `${c.color}20`, color: c.color }}>{c.initials || c.name.slice(0,2)}</div>
                <div className={styles.cName}>{c.name}</div>
                <div className={styles.cParty}>{c.party}</div>
                <div className={styles.cId}>ID: {c.candidateId}</div>
                <div className={styles.cVotes}>{c.voteCount.toLocaleString()} votes</div>
                <div className={styles.cPct}>{c.isActive ? 'Active' : 'Inactive'}</div>
                {c.isActive && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveCandidate(c.candidateId)}
                    disabled={candidateLoading}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
