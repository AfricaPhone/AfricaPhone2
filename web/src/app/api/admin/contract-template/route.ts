import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import {
  getCotisationContractTemplate,
  uploadCotisationContractTemplate,
} from '@/server/cotisationContractTemplate';

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const requireAdmin = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Session admin requise.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    if (decodedToken.admin !== true) {
      return { ok: false as const, response: errorResponse('Droits admin requis.', 403) };
    }

    return { ok: true as const, uid: decodedToken.uid };
  } catch (error) {
    console.error('admin contract template: invalid token', error);
    return { ok: false as const, response: errorResponse('Session admin invalide ou expiree.', 401) };
  }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const template = await getCotisationContractTemplate();
    return NextResponse.json({ template });
  } catch (error) {
    console.error('admin contract template: read failed', error);
    return errorResponse('Impossible de charger le contrat cotisation.', 500);
  }
}

export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Fichier contrat manquant.', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return errorResponse('Ajoutez un fichier de contrat.', 400);
  }

  try {
    const template = await uploadCotisationContractTemplate({
      file,
      updatedBy: adminResult.uid,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('admin contract template: upload failed', error);
    const message = error instanceof Error ? error.message : 'Impossible de publier le contrat cotisation.';
    return errorResponse(message, 400);
  }
}
