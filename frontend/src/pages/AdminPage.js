import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCandidates,
  addCandidate,
  deleteCandidate,
  openElection,
  closeElection,
  publishResults,
  getElectionStatus,
} from '../api';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

export default function AdminPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [newParty, setNewParty] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/');
      return;
    }
    try {
      const [candRes, statusRes] = await Promise.all([getCandidates(), getElectionStatus()]);
      setCandidates(candRes.data || []);
      setStatus(statusRes.data?.status || '');
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  function notify(msg, isError = false) {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  }

  async function handleAddCandidate(e) {
    e.preventDefault();
    setActionLoading(true);
    try {
      await addCandidate({ name: newName, party: newParty });
      setNewName('');
      setNewParty('');
      notify('Candidate added successfully.');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to add candidate.', true);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this candidate?')) return;
    setActionLoading(true);
    try {
      await deleteCandidate(id);
      notify('Candidate removed.');
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete candidate.', true);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleElectionAction(fn, successMsg) {
    setActionLoading(true);
    try {
      await fn();
      notify(successMsg);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'Action failed.', true);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <Header isAdmin />
      <main className="page admin-page">
        <h2 className="page-title">Admin Dashboard</h2>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        {/* Election Controls */}
        <section className="admin-section">
          <h3>Election Status: <span className={`badge badge-${status}`}>{status || 'unknown'}</span></h3>
          <div className="admin-actions">
            <button
              className="btn btn-primary"
              disabled={status === 'open' || actionLoading}
              onClick={() => handleElectionAction(openElection, 'Election opened.')}
            >
              Open Election
            </button>
            <button
              className="btn btn-danger"
              disabled={status !== 'open' || actionLoading}
              onClick={() => handleElectionAction(closeElection, 'Election closed.')}
            >
              Close Election
            </button>
            <button
              className="btn btn-outline"
              disabled={status === 'published' || status === 'open' || actionLoading}
              onClick={() => handleElectionAction(publishResults, 'Results published.')}
            >
              Publish Results
            </button>
          </div>
        </section>

        {/* Add Candidate */}
        <section className="admin-section">
          <h3>Add Candidate</h3>
          <form onSubmit={handleAddCandidate} className="admin-form">
            <input
              type="text"
              placeholder="Candidate Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Party / Affiliation"
              value={newParty}
              onChange={(e) => setNewParty(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? <Spinner /> : 'Add'}
            </button>
          </form>
        </section>

        {/* Candidate List */}
        <section className="admin-section">
          <h3>Candidates ({candidates.length})</h3>
          {candidates.length === 0 ? (
            <p className="empty-state">No candidates added yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Party</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.party}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(c._id)}
                        disabled={actionLoading}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
