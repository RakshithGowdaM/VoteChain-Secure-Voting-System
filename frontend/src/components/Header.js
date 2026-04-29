import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header({ isAdmin }) {
  const navigate = useNavigate();
  const electionName =
    process.env.REACT_APP_ELECTION_NAME || 'VoteChain Election';

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  }

  return (
    <header className="header">
      <Link to="/" className="header-brand">
        🗳️ {electionName}
      </Link>
      <nav className="header-nav">
        <Link to="/results">Results</Link>
        {isAdmin && <Link to="/admin">Admin</Link>}
        <button className="btn btn-outline" onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
