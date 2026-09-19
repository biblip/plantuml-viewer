import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the current app shell', () => {
  render(<App />);

  expect(screen.getByText('PlantUML Viewer', { selector: '.brand-title' })).toBeInTheDocument();
  expect(screen.getByText(/Live render/i)).toBeInTheDocument();
});

test('closes diagram menus when a file drag begins', () => {
  const { container } = render(<App />);
  const appShell = container.querySelector('.app-shell');
  const fileDrag = { dataTransfer: { types: ['Files'] } };

  fireEvent.click(screen.getByRole('button', { name: 'Export diagram' }));
  expect(screen.getByRole('menu', { name: 'Export diagram as' })).toBeInTheDocument();

  fireEvent.dragEnter(appShell, fileDrag);
  expect(screen.queryByRole('menu', { name: 'Export diagram as' })).not.toBeInTheDocument();

  fireEvent.contextMenu(container.querySelector('.diagram-stage'), { clientX: 100, clientY: 100 });
  expect(screen.getByRole('menu', { name: 'Diagram actions' })).toBeInTheDocument();

  fireEvent.dragEnter(appShell, fileDrag);
  expect(screen.queryByRole('menu', { name: 'Diagram actions' })).not.toBeInTheDocument();
});
