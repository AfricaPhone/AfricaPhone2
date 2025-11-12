import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ContestSubmissionSettings } from '@/types/contestSubmission';
import { contestDraftStorageKey } from '@/utils/contestCandidate';
import ContestApplicationClient from './ContestApplicationClient';

const mockRef = jest.fn((_storage: unknown, path: string) => ({ fullPath: path }));
const mockUploadBytes = jest.fn(() => Promise.resolve());
const mockGetDownloadURL = jest.fn(() => Promise.resolve('https://cdn.test/photo.jpg'));

jest.mock('firebase/storage', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
}));

jest.mock('@/lib/firebaseClient', () => ({
  storage: {},
}));

jest.mock('@/utils/hashBrowser', () => ({
  sha256HexBrowser: jest.fn(() => Promise.resolve('a'.repeat(64))),
}));

const originalCrypto = globalThis.crypto;
const originalURL = globalThis.URL;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...originalCrypto,
      randomUUID: jest.fn(() => '1234567890abcdef1234567890abcdef'),
    },
    configurable: true,
  });

  const createObjectURL = jest.fn(() => 'blob:test');
  const revokeObjectURL = jest.fn();
  Object.defineProperty(globalThis, 'URL', {
    value: {
      createObjectURL,
      revokeObjectURL,
    },
    configurable: true,
  });

  class MockImage {
    width = 1200;
    height = 800;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      this.onload?.();
    }
  }

  Object.defineProperty(globalThis, 'Image', {
    value: MockImage,
    configurable: true,
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({
      drawImage: jest.fn(),
    }),
    configurable: true,
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: (callback: BlobCallback) => {
      callback(new Blob(['mock'], { type: 'image/jpeg' }));
    },
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: originalCrypto,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'URL', {
    value: originalURL,
    configurable: true,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: originalGetContext,
    configurable: true,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: originalToBlob,
    configurable: true,
  });
});

const baseSettings: ContestSubmissionSettings = {
  contestId: 'f9NdI6f1lH7Z2ZxUzEFt',
  sitePublicUrl: 'https://example.com/votes',
  isOpen: true,
};

const renderComponent = (settings: Partial<ContestSubmissionSettings> = {}) =>
  render(<ContestApplicationClient initialSettings={{ ...baseSettings, ...settings }} />);

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

describe('ContestApplicationClient', () => {
  it('blocks submission when the contest is closed', () => {
    renderComponent({ isOpen: false });
    expect(screen.getByText(/La phase de candidatures est cl\u00f4tur\u00e9e\./i)).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /candidatures cl\u00f4tur\u00e9es/i });
    expect(submitButton).toBeDisabled();
  });

  it('exposes validation errors when required fields are missing', async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/Nom complet/i), { target: { value: 'Test Journaliste' } });
    fireEvent.change(screen.getByLabelText(/M\u00e9dia & biographie/i), {
      target: { value: 'Radio Test\nBio courte' },
    });
    fireEvent.change(screen.getByLabelText(/T\u00e9l\u00e9phone WhatsApp/i), { target: { value: '12345' } });

    fireEvent.click(screen.getByRole('button', { name: /Soumettre ma candidature/i }));

    await waitFor(() => {
      expect(screen.getByText(/Num\u00e9ro WhatsApp au format international requis/i)).toBeInTheDocument();
      expect(screen.getByText(/Merci de t\u00e9l\u00e9verser votre photo/i)).toBeInTheDocument();
    });
  });

  it('saves and restores draft data from localStorage', async () => {
    const { unmount } = renderComponent();
    fireEvent.change(screen.getByLabelText(/Nom complet/i), { target: { value: 'Jane Reporter' } });
    fireEvent.change(screen.getByLabelText(/M\u00e9dia & biographie/i), {
      target: { value: 'TV B\u00e9nin\nReporter terrain.' },
    });
    fireEvent.change(screen.getByLabelText(/T\u00e9l\u00e9phone WhatsApp/i), { target: { value: '+22960000000' } });

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer pour plus tard/i }));

    await waitFor(() => {
      const stored = window.localStorage.getItem(contestDraftStorageKey);
      expect(stored).toContain('Jane Reporter');
    });

    unmount();
    renderComponent();

    expect(await screen.findByDisplayValue('Jane Reporter')).toBeInTheDocument();
    expect(screen.getByLabelText(/M\u00e9dia & biographie/i)).toHaveDisplayValue(/TV B\u00e9nin/);
    expect(screen.getByText(/Brouillon charg\u00e9 automatiquement/i)).toBeInTheDocument();
  });

  it('uploading a photo transmet les m\u00e9tadonn\u00e9es slugifi\u00e9es', async () => {
    const { container } = renderComponent({ contestId: 'Concours Presse 2025' });
    fireEvent.change(screen.getByLabelText(/T\u00e9l\u00e9phone WhatsApp/i), { target: { value: '+22960000000' } });

    const fileInput = container.querySelector('input[type=\"file\"]') as HTMLInputElement;
    const file = new File(['photo'], 'portrait.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(mockUploadBytes).toHaveBeenCalled());

    const uploadArgs = mockUploadBytes.mock.calls[0];
    const metadata = uploadArgs[2]?.customMetadata as Record<string, string>;
    expect(metadata.contestId).toBe('Concours Presse 2025');
    expect(metadata.contestIdSlug).toBe('concours-presse-2025');
    expect(metadata.phoneHash).toHaveLength(64);
  });
});
