"""Application configuration from environment."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-change-me-in-production')
    JWT_SECRET = os.getenv('JWT_SECRET', os.getenv('SECRET_KEY', 'dev-change-me-in-production'))
    JWT_EXPIRES_HOURS = int(os.getenv('JWT_EXPIRES_HOURS', '168'))  # 7 days

    NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
    NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', '')

    PORT = int(os.getenv('PORT', '8010'))
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() in ('1', 'true', 'yes')

    # Public base URL for invite links in emails (no trailing slash)
    APP_PUBLIC_URL = os.getenv('APP_PUBLIC_URL', 'http://localhost:8010').rstrip('/')

    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv(
            'CORS_ORIGINS',
            'http://localhost:8010,http://127.0.0.1:8010,'
            'http://localhost:5173,http://127.0.0.1:5173,'
            'http://localhost:3000,http://127.0.0.1:3000',
        ).split(',')
        if o.strip()
    ]

    # Built Vite SPA (frontend/dist). Falls back to legacy HTML when missing.
    FRONTEND_DIST = Path(os.getenv('FRONTEND_DIST', BASE_DIR / 'frontend' / 'dist'))

    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'photos')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB

    # S3-compatible storage (Cloudflare R2, AWS S3, MinIO, Backblaze B2)
    # If incomplete, photos stay on local disk.
    S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT_URL', '').rstrip('/')
    S3_ACCESS_KEY_ID = os.getenv('S3_ACCESS_KEY_ID', '')
    S3_SECRET_ACCESS_KEY = os.getenv('S3_SECRET_ACCESS_KEY', '')
    S3_BUCKET = os.getenv('S3_BUCKET', '')
    S3_REGION = os.getenv('S3_REGION', 'auto')
    S3_PUBLIC_BASE_URL = os.getenv('S3_PUBLIC_BASE_URL', '').rstrip('/')
    # R2 usually does not use ACL; set true for AWS public buckets if needed
    S3_PUBLIC_ACL = os.getenv('S3_PUBLIC_ACL', 'false').lower() in ('1', 'true', 'yes')

    # SMTP for invite emails (optional — falls back to server console log)
    SMTP_HOST = os.getenv('SMTP_HOST', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM = os.getenv('SMTP_FROM', '')
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() in ('1', 'true', 'yes')
    SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'false').lower() in ('1', 'true', 'yes')

    INVITE_EXPIRES_DAYS = int(os.getenv('INVITE_EXPIRES_DAYS', '14'))

    VALID_RELATIONSHIP_TYPES = [
        'SPOUSE_OF',
        'HAS_CHILD',
        'CHILD_OF',
        'SIBLING_OF',
        'PARENT_OF',
        'FRIEND_OF',
    ]

    ROLES = ('owner', 'editor', 'viewer')
    WRITE_ROLES = ('owner', 'editor')
