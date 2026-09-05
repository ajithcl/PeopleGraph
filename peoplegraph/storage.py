"""Photo storage backends: local disk (default) or S3-compatible (Cloudflare R2, etc.)."""

import logging
import os
import uuid
from pathlib import Path
from urllib.parse import urlparse

from peoplegraph.config import Config

logger = logging.getLogger(__name__)


class StorageBackend:
    name = 'base'

    def save(self, file_storage, person_id: str, original_filename: str) -> str:
        raise NotImplementedError

    def delete_by_url(self, photo_url: str) -> None:
        raise NotImplementedError

    def delete_for_person(self, person_id: str, photo_url: str = '') -> None:
        if photo_url:
            self.delete_by_url(photo_url)


class LocalStorage(StorageBackend):
    name = 'local'

    def __init__(self, upload_folder: str):
        self.upload_folder = upload_folder
        Path(upload_folder).mkdir(parents=True, exist_ok=True)

    def _filename(self, person_id: str, original_filename: str) -> str:
        ext = original_filename.rsplit('.', 1)[-1].lower()
        return f'person_{person_id}_{uuid.uuid4().hex[:8]}.{ext}'

    def save(self, file_storage, person_id: str, original_filename: str) -> str:
        filename = self._filename(person_id, original_filename)
        path = os.path.join(self.upload_folder, filename)
        file_storage.save(path)
        return f'/uploads/photos/{filename}'

    def delete_by_url(self, photo_url: str) -> None:
        if not photo_url:
            return
        # Accept /uploads/photos/foo.jpg or full URL ending with that path
        path = urlparse(photo_url).path if '://' in photo_url else photo_url
        if not path.startswith('/uploads/photos/'):
            return
        filename = path.rsplit('/', 1)[-1]
        if '..' in filename or not filename:
            return
        filepath = os.path.join(self.upload_folder, filename)
        if os.path.isfile(filepath):
            os.remove(filepath)
            logger.info('Deleted local photo %s', filename)

    def delete_for_person(self, person_id: str, photo_url: str = '') -> None:
        if photo_url:
            self.delete_by_url(photo_url)
        # Also clear any leftover local files for this person
        try:
            for filename in os.listdir(self.upload_folder):
                if filename.startswith(f'person_{person_id}_'):
                    os.remove(os.path.join(self.upload_folder, filename))
        except OSError as e:
            logger.warning('Local photo cleanup: %s', e)


class S3Storage(StorageBackend):
    name = 's3'

    def __init__(self):
        import boto3
        from botocore.client import Config as BotoConfig

        self.bucket = Config.S3_BUCKET
        self.public_base = Config.S3_PUBLIC_BASE_URL.rstrip('/')
        kwargs = {
            'aws_access_key_id': Config.S3_ACCESS_KEY_ID,
            'aws_secret_access_key': Config.S3_SECRET_ACCESS_KEY,
            'region_name': Config.S3_REGION or 'auto',
        }
        if Config.S3_ENDPOINT_URL:
            kwargs['endpoint_url'] = Config.S3_ENDPOINT_URL
            kwargs['config'] = BotoConfig(signature_version='s3v4')

        self.client = boto3.client('s3', **kwargs)

    def _key(self, person_id: str, original_filename: str) -> str:
        ext = original_filename.rsplit('.', 1)[-1].lower()
        return f'photos/{person_id}/{uuid.uuid4().hex[:12]}.{ext}'

    def save(self, file_storage, person_id: str, original_filename: str) -> str:
        key = self._key(person_id, original_filename)
        content_type = file_storage.mimetype or 'application/octet-stream'
        self.client.upload_fileobj(
            file_storage.stream,
            self.bucket,
            key,
            ExtraArgs={
                'ContentType': content_type,
                'ACL': 'public-read',
            } if Config.S3_PUBLIC_ACL else {
                'ContentType': content_type,
            },
        )
        return f'{self.public_base}/{key}'

    def delete_by_url(self, photo_url: str) -> None:
        if not photo_url or not self.public_base:
            return
        if photo_url.startswith(self.public_base + '/'):
            key = photo_url[len(self.public_base) + 1:]
        elif '/photos/' in photo_url:
            key = 'photos/' + photo_url.split('/photos/', 1)[1]
        else:
            return
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info('Deleted S3 object %s', key)
        except Exception as e:
            logger.warning('S3 delete failed for %s: %s', key, e)


_storage = None


def storage_configured_for_s3() -> bool:
    return bool(
        Config.S3_BUCKET
        and Config.S3_ACCESS_KEY_ID
        and Config.S3_SECRET_ACCESS_KEY
        and Config.S3_PUBLIC_BASE_URL
    )


def get_storage() -> StorageBackend:
    global _storage
    if _storage is not None:
        return _storage

    if storage_configured_for_s3():
        try:
            _storage = S3Storage()
            logger.info('Using S3-compatible photo storage (bucket=%s)', Config.S3_BUCKET)
            return _storage
        except Exception as e:
            logger.error('S3 storage init failed, falling back to local: %s', e)

    _storage = LocalStorage(Config.UPLOAD_FOLDER)
    logger.info('Using local photo storage (%s)', Config.UPLOAD_FOLDER)
    return _storage


def reset_storage_cache():
    """Test helper."""
    global _storage
    _storage = None
