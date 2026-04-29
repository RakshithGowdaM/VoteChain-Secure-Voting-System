import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page by default', () => {
  render(<App />);
  expect(screen.getByText(/Voter Login/i)).toBeInTheDocument();
});

test('renders admin login tab', () => {
  render(<App />);
  expect(screen.getByText(/Admin Login/i)).toBeInTheDocument();
});
