import type { StudySession } from '../types/models';

export function sessionAccuracy(session: StudySession): number {
  const total = session.ratings.again + session.ratings.hard + session.ratings.good + session.ratings.easy;
  if (total === 0) return 0;
  return (session.ratings.good + session.ratings.easy) / total;
}

export function sessionDuration(session: StudySession): number {
  return Math.round((session.endedAt - session.startedAt) / 1000);
}
