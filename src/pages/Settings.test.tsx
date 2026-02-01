import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from './Settings';
import { StorageProvider } from '@/lib/StorageContext';
import { clearAllData } from '@/lib/storage';

// Wrapper component with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <StorageProvider>{ui}</StorageProvider>
    </BrowserRouter>
  );
}

describe('Settings Page', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('renders settings page', async () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Timer')).toBeInTheDocument();
    expect(screen.getByText('Equipment')).toBeInTheDocument();
  });

  it('shows lbs as default unit', async () => {
    renderWithProviders(<Settings />);

    const lbsButton = screen.getByRole('button', { name: /pounds/i });
    expect(lbsButton).toHaveClass('bg-primary');
  });

  it('toggles unit preference', async () => {
    renderWithProviders(<Settings />);

    const kgButton = screen.getByRole('button', { name: /kilograms/i });
    fireEvent.click(kgButton);

    await waitFor(() => {
      expect(kgButton).toHaveClass('bg-primary');
    });

    const lbsButton = screen.getByRole('button', { name: /pounds/i });
    expect(lbsButton).not.toHaveClass('bg-primary');
  });

  it('displays bar weight inputs', async () => {
    renderWithProviders(<Settings />);

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    // First input should be standard bar weight (45)
    expect(inputs[0]).toHaveValue(45);
  });

  it('updates bar weight value', async () => {
    renderWithProviders(<Settings />);

    const inputs = screen.getAllByRole('spinbutton');
    const barWeightInput = inputs[0];

    fireEvent.change(barWeightInput, { target: { value: '50' } });

    await waitFor(() => {
      expect(barWeightInput).toHaveValue(50);
    });
  });

  it('displays timer checkboxes', async () => {
    renderWithProviders(<Settings />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    // Both should be checked by default
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('toggles audio checkbox', async () => {
    renderWithProviders(<Settings />);

    const checkboxes = screen.getAllByRole('checkbox');
    const audioCheckbox = checkboxes[0];

    expect(audioCheckbox).toBeChecked();

    fireEvent.click(audioCheckbox);

    await waitFor(() => {
      expect(audioCheckbox).not.toBeChecked();
    });
  });

  it('displays device ID', async () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText(/Device ID:/)).toBeInTheDocument();
  });

  it('shows GitHub sync section', async () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText('GitHub Sync')).toBeInTheDocument();
    // The button text varies based on OAuth configuration
    expect(
      screen.getByRole('button', { name: /setup github sync|connect with github/i })
    ).toBeInTheDocument();
  });
});
