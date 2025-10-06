import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Share } from 'react-native';
import VoteConfirmationModal from './VoteConfirmationModal';
import { Candidate } from '../types';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('VoteConfirmationModal', () => {
  const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({} as any);

  const candidate: Candidate = {
    id: 'cand-1',
    contestId: 'contest-1',
    name: 'Jean Dupont',
    media: 'Radio Demo',
    photoUrl: 'https://example.com/photo.jpg',
    voteCount: 10,
  };

  beforeEach(() => {
    shareSpy.mockClear();
  });

  it('shows success message with transaction id', () => {
    render(
      <VoteConfirmationModal
        visible
        onClose={jest.fn()}
        candidate={candidate}
        transactionId="tx-success-123"
        status="success"
      />
    );

    expect(screen.getByText('Vote enregistre !')).toBeTruthy();
    expect(screen.getByText('Merci pour votre soutien a Jean Dupont.')).toBeTruthy();
    expect(screen.getByText('tx-success-123')).toBeTruthy();
    expect(screen.getByText('Partager mon vote')).toBeTruthy();
  });

  it('shares the vote when the button is pressed', () => {
    render(
      <VoteConfirmationModal
        visible
        onClose={jest.fn()}
        candidate={candidate}
        transactionId="tx-success-456"
        status="success"
      />
    );

    fireEvent.press(screen.getByText('Partager mon vote'));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(shareSpy).toHaveBeenCalledWith({
      message: "Je soutiens Jean Dupont au concours du Journaliste Tech de l'annee ! Faites comme moi ! #ConcoursAfricaphone",
    });
  });

  it('shows custom failure message and hides share button', () => {
    render(
      <VoteConfirmationModal
        visible
        onClose={jest.fn()}
        candidate={null}
        status="failed"
        message="Paiement refuse par la banque."
      />
    );

    expect(screen.getByText('Paiement interrompu')).toBeTruthy();
    expect(screen.getByText('Paiement refuse par la banque.')).toBeTruthy();
    expect(screen.queryByText('Partager mon vote')).toBeNull();
  });
});
