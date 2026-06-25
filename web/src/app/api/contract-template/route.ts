import { NextResponse } from 'next/server';
import { getCotisationContractTemplate } from '@/server/cotisationContractTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const template = await getCotisationContractTemplate();
    return NextResponse.json({ template });
  } catch (error) {
    console.error('contract template: read failed', error);
    return NextResponse.json({ message: 'Contrat cotisation indisponible.' }, { status: 500 });
  }
}
