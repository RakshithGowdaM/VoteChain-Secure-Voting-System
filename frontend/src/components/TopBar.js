import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './TopBar.module.css';

export default function TopBar() {
  const [blockNum, setBlockNum] = useState(19847231);
  const location = useLocation();

  useEffect(() => {
    const iv = setInterval(() => {
      setBlockNum(n => n + Math.floor(Math.random() * 2));
    }, 12000); // ~12s Ethereum block time
    return () => clearInterval(iv);
  }, []);

  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <div className={styles.logoName}>VoteChain</div>
          <div className={styles.logoSub}>SECURE · TRANSPARENT · IMMUTABLE</div>
        </div>
      </Link>

      <nav className={styles.nav}>
        <Link to="/" className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}>Vote</Link>
        <Link to="/verify" className={`${styles.navLink} ${location.pathname === '/verify' ? styles.active : ''}`}>Verify</Link>
        <Link to="/results" className={`${styles.navLink} ${location.pathname === '/results' ? styles.active : ''}`}>Results</Link>
        <Link to="/admin" className={`${styles.navLink} ${location.pathname.startsWith('/admin') ? styles.active : ''}`}>Admin</Link>
      </nav>

      <div className={styles.pills}>
        <div className={`${styles.pill} ${styles.online}`}>
          <span className={styles.dot}></span>
          Network Live
        </div>
        <div className={`${styles.pill} ${styles.chain}`}>
          <span className={styles.dotBlue}></span>
          Block #{blockNum.toLocaleString()}
        </div>
      </div>

    </header>
  );
}
