import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ContestApplicationClient from './ContestApplicationClient';

import type { ContestSubmissionSettings } from '@/types/contestSubmission';
import { contestDraftStorageKey } from '@/utils/contestCandidate';

const baseSettings: ContestSubmissionSettings = {
  contestId: 'f9NdI6f1lH7Z2ZxUzEFt',
  sitePublicUrl: 'https://example.com/votes',
  isOpen: true,
};

const renderComponent = (settings: Partial<ContestSubmissionSettings> = {}) =>
  render(<ContestApplicationClient initialSettings={{ ...baseSettings, ...settings }} />);

beforeEach(() => {
  window.localStorage.clear();
  jest.resetAllMocks();
});

describe('ContestApplicationClient', () => {
  it('blocks submission when the contest is closed', () => {
    renderComponent({ isOpen: false });
    expect(screen.getByText(/La phase de candidatures est clôturée\./i)).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /candidatures clôturées/i });
    expect(submitButton).toBeDisabled();
  });

  it('exposes validation errors when required fields are missing', async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/Nom complet/i), { target: { value: 'Test Journaliste' } });
    fireEvent.change(screen.getByLabelText(/Média & biographie/i), {
      target: { value: 'Radio Test\nBio courte' },
    });
    fireEvent.change(screen.getByLabelText(/Téléphone WhatsApp/i), { target: { value: '12345' } });

    fireEvent.click(screen.getByRole('button', { name: /Soumettre ma candidature/i }));

    await waitFor(() => {
      expect(screen.getByText(/Numéro WhatsApp au format international requis/i)).toBeInTheDocument();
      expect(screen.getByText(/Merci de téléverser votre photo/i)).toBeInTheDocument();
    });
  });

  it('saves and restores draft data from localStorage', async () => {
    const { unmount } = renderComponent();
    fireEvent.change(screen.getByLabelText(/Nom complet/i), { target: { value: 'Jane Reporter' } });
    fireEvent.change(screen.getByLabelText(/Média & biographie/i), {
      target: { value: 'TV Bénin\nReporter terrain.' },
    });
    fireEvent.change(screen.getByLabelText(/Téléphone WhatsApp/i), { target: { value: '+22960000000' } });

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer pour plus tard/i }));

    await waitFor(() => {
      const stored = window.localStorage.getItem(contestDraftStorageKey);
      expect(stored).toContain('Jane Reporter');
    });

    unmount();
    renderComponent();

    expect(await screen.findByDisplayValue('Jane Reporter')).toBeInTheDocument();
    expect(screen.getByLabelText(/Média & biographie/i)).toHaveDisplayValue(/TV Bénin/);
    expect(screen.getByText(/Brouillon chargé automatiquement/i)).toBeInTheDocument();
  });
});
