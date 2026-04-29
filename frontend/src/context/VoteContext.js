import React, { createContext, useContext, useReducer } from 'react';

const VoteContext = createContext(null);

const initialState = {
  step: 1, // 1=phone, 2=otp, 3=candidates, 4=confirm, 5=success
  phone: '',
  sessionToken: null,
  devOtp: null,
  authToken: null,
  votingToken: null,
  selectedCandidate: null,
  candidates: [],
  txResult: null,
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PHONE': return { ...state, phone: action.payload };
    case 'SET_STEP': return { ...state, step: action.payload, error: null };
    case 'SET_SESSION': return { ...state, sessionToken: action.payload };
    case 'SET_DEV_OTP': return { ...state, devOtp: action.payload };
    case 'SET_AUTH': return {
      ...state,
      authToken: action.payload.authToken,
      votingToken: action.payload.votingToken,
    };
    case 'SET_CANDIDATES': return { ...state, candidates: action.payload };
    case 'SELECT_CANDIDATE': return { ...state, selectedCandidate: action.payload };
    case 'SET_TX_RESULT': return { ...state, txResult: action.payload };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    case 'RESET': return { ...initialState };
    default: return state;
  }
}

export function VoteProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <VoteContext.Provider value={{ state, dispatch }}>
      {children}
    </VoteContext.Provider>
  );
}

export function useVote() {
  const ctx = useContext(VoteContext);
  if (!ctx) throw new Error('useVote must be used within VoteProvider');
  return ctx;
}
