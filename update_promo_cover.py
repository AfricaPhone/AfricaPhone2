import uuid
from pathlib import Path
from urllib.parse import quote

from PIL import Image
import firebase_admin
from firebase_admin import credentials, storage, firestore

PROJECT_ROOT = Path(__file__).resolve().parent
SERVICE_ACCOUNT = PROJECT_ROOT / 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json'
SOURCE = PROJECT_ROOT / 'cover_carte_pronostique' / 'IMG-20251006-WA0008.jpg'
OUTPUT = PROJECT_ROOT / 'cover_carte_pronostique' / 'IMG-20251006-WA0008.webp'
BUCKET = 'africaphone-vente.firebasestorage.app'
COLLECTION = 'promoCards'
DOC_ID = 'prediction-game-cover'
MAX_WIDTH = 1400
QUALITY = 80

cred = credentials.Certificate(SERVICE_ACCOUNT)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'storageBucket': BUCKET,
    })

bucket = storage.bucket()
db = firestore.client()

with Image.open(SOURCE) as img:
    img = img.convert('RGB')
    width, height = img.size
    if width > MAX_WIDTH:
        scale = MAX_WIDTH / width
        img = img.resize((int(width * scale), int(height * scale)), Image.LANCZOS)
    img.save(OUTPUT, 'WEBP', quality=QUALITY, method=6)
    print(f'Converted to {OUTPUT.name}')

blob_name = f'promoCards/{OUTPUT.name}'
blob = bucket.blob(blob_name)
token = str(uuid.uuid4())
blob.upload_from_filename(OUTPUT, content_type='image/webp')
blob.metadata = blob.metadata or {}
blob.metadata['firebaseStorageDownloadTokens'] = token
blob.patch()

safe_blob = quote(blob_name, safe='')
download_url = f'https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/{safe_blob}?alt=media&token={token}'
print('Uploaded URL:', download_url)

payload = {
    'image': download_url,
    'updatedAt': firestore.SERVER_TIMESTAMP,
}

ref = db.collection(COLLECTION).document(DOC_ID)
existing = ref.get()
if existing.exists and existing.to_dict().get('title'):
    payload.setdefault('title', existing.to_dict().get('title'))
if existing.exists and existing.to_dict().get('subtitle'):
    payload.setdefault('subtitle', existing.to_dict().get('subtitle'))

ref.set(payload, merge=True)
print(f'Updated {COLLECTION}/{DOC_ID}')
