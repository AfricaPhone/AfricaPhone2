import { computeContestSchedule } from '@/utils/contestSchedule';

describe('computeContestSchedule', () => {
  it('uses fallback windows and marks submission open between 4 and 10 December', () => {
    const now = new Date(Date.UTC(2025, 11, 5, 12, 0, 0));
    const schedule = computeContestSchedule({}, now);
    expect(schedule.isSubmissionOpen).toBe(true);
    expect(schedule.phase).toBe('submission');
    expect(schedule.submissionOpenAt).toBe('2025-12-04T00:00:00.000Z');
    expect(schedule.submissionCloseAt).toBe('2025-12-10T00:00:00.000Z');
  });

  it('switches to voting phase after submission closes', () => {
    const now = new Date(Date.UTC(2025, 11, 15, 10, 0, 0));
    const schedule = computeContestSchedule({}, now);
    expect(schedule.isSubmissionOpen).toBe(false);
    expect(schedule.isVotingOpen).toBe(true);
    expect(schedule.phase).toBe('voting');
  });

  it('marks closed after voting window', () => {
    const now = new Date(Date.UTC(2025, 11, 26, 1, 0, 0));
    const schedule = computeContestSchedule({}, now);
    expect(schedule.phase).toBe('closed');
    expect(schedule.isSubmissionOpen).toBe(false);
    expect(schedule.isVotingOpen).toBe(false);
  });
});
