import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the current app shell', () => {
  render(<App />);

  expect(screen.getByText('PlantUML Viewer', { selector: '.brand-title' })).toBeInTheDocument();
  expect(screen.getByText(/Live render/i)).toBeInTheDocument();
});
