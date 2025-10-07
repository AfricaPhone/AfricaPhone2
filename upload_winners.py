import os
import uuid
from pathlib import Path
from urllib.parse import quote

from PIL import Image
import firebase_admin
from firebase_admin import credentials, storage, firestore

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT
SERVICE_ACCOUNT = PROJECT_ROOT / 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json'
SOURCE_DIR = PROJECT_ROOT / 'images_a_televerser'
OUTPUT_DIR = PROJECT_ROOT / 'images_a_televerser_webp'
BUCKET_NAME = 'africaphone-vente.firebasestorage.app'
COLLECTION_NAME = 'winnerGallery'
MAX_DIMENSION = 900
WEBP_QUALITY = 80

OUTPUT_DIR.mkdir(exist_ok=True)

cred = credentials.Certificate(SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred, {
    'storageBucket': BUCKET_NAME,
})

bucket = storage.bucket()
db = firestore.client()

image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif'}

for image_path in SOURCE_DIR.iterdir():
    if image_path.suffix.lower() not in image_extensions:
        continue

    with Image.open(image_path) as img:
        img = img.convert('RGB')
        width, height = img.size
        scale = min(1.0, MAX_DIMENSION / max(width, height))
        if scale < 1.0:
            img = img.resize((int(width * scale), int(height * scale)), Image.LANCZOS)

        output_path = OUTPUT_DIR / f"{image_path.stem}.webp"
        img.save(output_path, 'WEBP', quality=WEBP_QUALITY, method=6)
        print(f"Converted {image_path.name} -> {output_path.name}")

    blob_name = f"winnerGallery/{output_path.name}"
    blob = bucket.blob(blob_name)
    token = str(uuid.uuid4())
    blob.upload_from_filename(output_path, content_type='image/webp')
    blob.metadata = blob.metadata or {}
    blob.metadata['firebaseStorageDownloadTokens'] = token
    blob.patch()

    safe_path = quote(blob_name, safe='')
    download_url = f"https://firebasestorage.googleapis.com/v0/b/{BUCKET_NAME}/o/{safe_path}?alt=media&token={token}"
    print(f"Uploaded {blob_name}\n -> {download_url}")

    doc_id = output_path.stem
    payload = {
        'photoUrl': download_url,
        'isPublic': True,
        'keywords': download_url.lower(),
        'updatedAt': firestore.SERVER_TIMESTAMP,
    }
    doc_ref = db.collection(COLLECTION_NAME).document(doc_id)
    existing = doc_ref.get()
    if existing.exists and 'createdAt' in existing.to_dict():
        payload['createdAt'] = existing.to_dict().get('createdAt')
    else:
        payload['createdAt'] = firestore.SERVER_TIMESTAMP

    doc_ref.set(payload, merge=True)
    print(f"Firestore document {doc_id} upserted.")

print('Done.')
