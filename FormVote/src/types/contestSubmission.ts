export type ContestSubmissionSettings = {
  contestId: string;
  sitePublicUrl: string;
  isOpen: boolean; // équivalent à isSubmissionOpen pour compatibilité
  isSubmissionOpen?: boolean;
  isVotingOpen?: boolean;
  phase?: 'submission' | 'voting' | 'closed';
  submissionOpenAt?: string;
  submissionCloseAt?: string;
  votingOpenAt?: string;
  votingCloseAt?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type ContestCandidateDraft = {
  contestId: string;
  fullName: string;
  media: string;
  biography: string;
  phone: string;
  email?: string;
  photoPath?: string;
  photoUrl?: string;
};

export type ContestCandidatePayload = {
  contestId: string;
  fullName: string;
  media: string;
  biography: string;
  phone: string;
  email?: string;
  photoPath: string;
};

export type ContestCandidateResponse = {
  message: string;
  candidateId: string;
  contestId: string;
};
