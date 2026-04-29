import React from 'react';
import styles from './StepBar.module.css';

const STEPS = ['Verify', 'OTP', 'Vote', 'Confirm', 'Done'];

export default function StepBar({ current }) {
  return (
    <div className={styles.bar}>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isDone = num < current;
        const isActive = num === current;
        return (
          <React.Fragment key={num}>
            <div className={styles.item}>
              <div className={`${styles.dot} ${isDone ? styles.done : ''} ${isActive ? styles.active : ''}`}>
                {isDone ? '✓' : num}
              </div>
              <span className={`${styles.label} ${isDone ? styles.labelDone : ''} ${isActive ? styles.labelActive : ''}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`${styles.line} ${isDone ? styles.lineDone : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
