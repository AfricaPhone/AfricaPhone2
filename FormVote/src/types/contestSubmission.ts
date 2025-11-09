export type ContestSubmissionSettings = {
  contestId: string;
  sitePublicUrl: string;
  isOpen: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export type ContestCandidateDraft = {
  contestId: string;
  fullName: string;
  media: string;
  biography: string;
  phone: string;
  photoPath?: string;
  photoUrl?: string;
};

export type ContestCandidatePayload = {
  contestId: string;
  fullName: string;
  media: string;
  biography: string;
  phone: string;
  photoPath: string;
};

export type ContestCandidateResponse = {
  message: string;
  candidateId: string;
  contestId: string;
};
