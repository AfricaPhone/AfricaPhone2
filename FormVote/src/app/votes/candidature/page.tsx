import { fetchContestSubmissionSettings } from '@/server/contestSubmissions';
import ContestApplicationClient from './ContestApplicationClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContestApplicationPage() {
  const settings = await fetchContestSubmissionSettings();

  return <ContestApplicationClient initialSettings={settings} />;
}
