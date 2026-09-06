# PeopleGraph Phase 4 — Cloud photos + invite email

## What shipped

### Photo storage
- Pluggable storage in [`peoplegraph/storage.py`](peoplegraph/storage.py)
- **Local** (default): `uploads/photos/` when S3 env vars are incomplete
- **S3-compatible** (Cloudflare R2, AWS S3, MinIO, B2): set `S3_*` in `.env`
- Upload/delete/person-delete all go through the storage backend
- `GET /health` reports `storage`, `s3_configured`

### Invite email
- [`peoplegraph/email_service.py`](peoplegraph/email_service.py)
- If `SMTP_*` is set to **real** host + from-address → send invite email
- Dummy `.env.example` values (`example.com`) stay on the **console** fallback
- Invite UI accepts optional email and shows delivery status
- Invite links use `APP_PUBLIC_URL`

## Setup Cloudflare R2 (free tier)

1. Create an R2 bucket + API token (Object Read & Write)
2. Enable a public bucket URL or custom domain
3. In `.env`:

```env
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=peoplegraph-photos
S3_REGION=auto
S3_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
S3_PUBLIC_ACL=false
```

4. Install deps and restart:

```bash
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py
```

## Setup SMTP (example Gmail app password)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=PeopleGraph <you@gmail.com>
SMTP_USE_TLS=true
APP_PUBLIC_URL=http://localhost:8010
```

Without SMTP, invites still work — check the Flask console for the logged email body.

## Verify

```bash
curl -s http://localhost:8010/health
# expect phase: 4, storage: local|s3, smtp_configured: true|false
```

## Next ideas (Phase 5)

- Vite/React production frontend
- Claim/link “this Person is me” onboarding
- Activity feed inside a space
