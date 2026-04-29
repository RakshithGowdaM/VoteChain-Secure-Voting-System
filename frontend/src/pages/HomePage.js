import React from 'react';
import { useVote } from '../context/VoteContext';
import StepBar from '../components/StepBar';
import PhoneStep from '../components/PhoneStep';
import OTPStep from '../components/OTPStep';
import CandidateStep from '../components/CandidateStep';
import ConfirmStep from '../components/ConfirmStep';
import SuccessStep from '../components/SuccessStep';

export default function HomePage() {
  const { state } = useVote();

  const renderStep = () => {
    switch (state.step) {
      case 1: return <PhoneStep />;
      case 2: return <OTPStep />;
      case 3: return <CandidateStep />;
      case 4: return <ConfirmStep />;
      case 5: return <SuccessStep />;
      default: return <PhoneStep />;
    }
  };

  return (
    <div>
      <StepBar current={state.step} />
      {renderStep()}
    </div>
  );
}
