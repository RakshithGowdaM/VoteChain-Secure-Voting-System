import React from 'react';

export default function CandidateCard({ candidate, selected, onSelect, disabled }) {
  return (
    <button
      className={`candidate-card${selected ? ' selected' : ''}`}
      onClick={() => !disabled && onSelect(candidate._id)}
      disabled={disabled}
      aria-pressed={selected}
    >
      <div className="candidate-avatar">
        {candidate.name.charAt(0).toUpperCase()}
      </div>
      <div className="candidate-info">
        <h3 className="candidate-name">{candidate.name}</h3>
        <p className="candidate-party">{candidate.party}</p>
      </div>
      {selected && <span className="candidate-check">✓</span>}
    </button>
  );
}
