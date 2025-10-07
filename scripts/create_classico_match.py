import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import firebase_admin
from firebase_admin import credentials, firestore, storage


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SERVICE_ACCOUNT = PROJECT_ROOT / 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json'
BUCKET_NAME = 'africaphone-vente.firebasestorage.app'

ASSETS = [
    {
        'label': 'Real Madrid',
        'source': PROJECT_ROOT / 'images_a_televerser_webp' / 'real-madrid.webp',
        'blob_name': 'matchLogos/classico-real-madrid.webp',
    },
    {
        'label': 'FC Barcelona',
        'source': PROJECT_ROOT / 'images_a_televerser_webp' / 'barca.webp',
        'blob_name': 'matchLogos/classico-barca.webp',
    },
]


def upload_asset(blob_name: str, local_path: Path) -> str:
    if not local_path.exists():
        raise FileNotFoundError(f"Missing asset: {local_path}")

    blob = storage.bucket().blob(blob_name)
    token = str(uuid.uuid4())
    blob.upload_from_filename(str(local_path), content_type='image/webp')
    blob.metadata = blob.metadata or {}
    blob.metadata['firebaseStorageDownloadTokens'] = token
    blob.patch()

    safe_path = quote(blob_name, safe='')
    return f"https://firebasestorage.googleapis.com/v0/b/{BUCKET_NAME}/o/{safe_path}?alt=media&token={token}"


def main() -> None:
    cred = credentials.Certificate(str(SERVICE_ACCOUNT))
    firebase_admin.initialize_app(cred, {'storageBucket': BUCKET_NAME})

    bucket = storage.bucket()
    if bucket is None:
        raise RuntimeError('Unable to access the default storage bucket.')

    db = firestore.client()

    uploaded_urls = {}
    for asset in ASSETS:
        url = upload_asset(asset['blob_name'], asset['source'])
        uploaded_urls[asset['label']] = url
        print(f"Uploaded {asset['label']} -> {url}")

    match_doc_id = 'classico-2025-10-25'
    start_time = datetime(2025, 10, 25, 18, 30, tzinfo=timezone.utc)

    data = {
        'teamA': 'Real Madrid',
        'teamB': 'FC Barcelona',
        'teamALogo': uploaded_urls['Real Madrid'],
        'teamBLogo': uploaded_urls['FC Barcelona'],
        'competition': 'Classico',
        'startTime': start_time,
        'predictionCount': 0,
        'trends': {},
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
    }

    db.collection('matches').document(match_doc_id).set(data, merge=True)
    print(f'Firestore document matches/{match_doc_id} created/updated.')


if __name__ == '__main__':
    main()
