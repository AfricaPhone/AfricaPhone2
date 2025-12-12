import { computeContestSchedule } from '@/utils/contestSchedule';

describe('computeContestSchedule', () => {
  it('returns closed phase when no input is provided (strict mode)', () => {
    const now = new Date(Date.UTC(2025, 11, 5, 12, 0, 0));
    const schedule = computeContestSchedule({}, now);
    expect(schedule.phase).toBe('closed');
    expect(schedule.isSubmissionOpen).toBe(false);
    expect(schedule.submissionOpenAt).toBeUndefined();
  });

  it('switches to voting phase after submission closes', () => {
    const now = new Date(Date.UTC(2025, 11, 20, 10, 0, 0));
    const schedule = computeContestSchedule({
      submissionOpenAt: new Date(Date.UTC(2025, 11, 4)),
      submissionCloseAt: new Date(Date.UTC(2025, 11, 15)),
      votingOpenAt: new Date(Date.UTC(2025, 11, 15)),
      votingCloseAt: new Date(Date.UTC(2025, 11, 25)),
    }, now);
    expect(schedule.isSubmissionOpen).toBe(false);
    expect(schedule.isVotingOpen).toBe(true);
    expect(schedule.phase).toBe('voting');
  });

  it('marks closed after voting window', () => {
    const now = new Date(Date.UTC(2025, 11, 26, 1, 0, 0));
    const schedule = computeContestSchedule({
      submissionOpenAt: new Date(Date.UTC(2025, 11, 4)),
      submissionCloseAt: new Date(Date.UTC(2025, 11, 15)),
      votingOpenAt: new Date(Date.UTC(2025, 11, 15)),
      votingCloseAt: new Date(Date.UTC(2025, 11, 25)),
    }, now);
    expect(schedule.phase).toBe('closed');
    expect(schedule.isSubmissionOpen).toBe(false);
    expect(schedule.isVotingOpen).toBe(false);
  });
});
