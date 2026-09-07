"""Shared serializers and date helpers."""

from datetime import datetime, timezone
from urllib.parse import quote, urlparse

import neo4j


def serialize_date(value):
    if value is None:
        return None
    if isinstance(value, neo4j.time.Date):
        return value.to_native().isoformat()
    if isinstance(value, str):
        return value
    return str(value)


def social_profile_url(value, hosts, site_prefix):
    """Turn a handle or pasted URL into an https profile link. Rejects other sites/schemes."""
    raw = (value or '').strip()
    if not raw:
        return ''
    lowered = raw.lower()
    if lowered.startswith(('javascript:', 'data:', 'vbscript:')):
        return ''
    if '://' in raw:
        try:
            parsed = urlparse(raw)
        except ValueError:
            return ''
        host = (parsed.hostname or '').lower()
        if parsed.scheme not in ('http', 'https'):
            return ''
        if any(host == h or host.endswith('.' + h) for h in hosts):
            return raw
        return ''
    handle = raw.lstrip('@').strip()
    for prefix in (
        'https://www.facebook.com/',
        'http://www.facebook.com/',
        'https://facebook.com/',
        'http://facebook.com/',
        'facebook.com/',
        'www.facebook.com/',
        'fb.com/',
        'https://www.instagram.com/',
        'http://www.instagram.com/',
        'https://instagram.com/',
        'instagram.com/',
        'www.instagram.com/',
    ):
        if handle.lower().startswith(prefix):
            handle = handle[len(prefix):]
            break
    handle = handle.split('/')[0].split('?')[0].strip()
    if not handle:
        return ''
    return f'https://{site_prefix}{quote(handle)}'


def facebook_profile_url(value):
    return social_profile_url(
        value,
        hosts=('facebook.com', 'fb.com', 'fb.me'),
        site_prefix='www.facebook.com/',
    )


def instagram_profile_url(value):
    return social_profile_url(
        value,
        hosts=('instagram.com', 'instagr.am'),
        site_prefix='www.instagram.com/',
    )


def linkedin_profile_url(value):
    """Handle, /in/ slug, or pasted LinkedIn URL → https profile link."""
    raw = (value or '').strip()
    if not raw:
        return ''
    lowered = raw.lower()
    if lowered.startswith(('javascript:', 'data:', 'vbscript:')):
        return ''
    if '://' in raw:
        try:
            parsed = urlparse(raw)
        except ValueError:
            return ''
        host = (parsed.hostname or '').lower()
        if parsed.scheme not in ('http', 'https'):
            return ''
        if host == 'linkedin.com' or host.endswith('.linkedin.com') or host == 'lnkd.in':
            return raw
        return ''
    handle = raw.lstrip('@').strip()
    for prefix in (
        'https://www.linkedin.com/',
        'http://www.linkedin.com/',
        'https://linkedin.com/',
        'http://linkedin.com/',
        'www.linkedin.com/',
        'linkedin.com/',
    ):
        if handle.lower().startswith(prefix):
            handle = handle[len(prefix):]
            break
    path = handle.split('?')[0].strip('/')
    if not path:
        return ''
    first, _, rest = path.partition('/')
    if first.lower() in ('in', 'pub', 'company') and rest:
        slug = rest.split('/')[0].strip()
        if not slug:
            return ''
        return f'https://www.linkedin.com/{first.lower()}/{quote(slug)}'
    slug = first.strip()
    if not slug:
        return ''
    return f'https://www.linkedin.com/in/{quote(slug)}'


PERSON_DETAIL_KEYS = ('phone', 'email', 'facebookId', 'instagram', 'linkedin', 'notes')


def person_details_from_body(data, existing=None):
    """Contact fields from a JSON body, keeping existing values when a key is omitted."""
    existing = existing or {}
    out = {}
    for key in PERSON_DETAIL_KEYS:
        if key in data:
            value = data.get(key)
            out[key] = '' if value is None else str(value).strip()
        else:
            out[key] = existing.get(key) or ''
    return out


def format_person(node):
    props = dict(node)
    facebook_id = props.get('facebookId') or ''
    instagram = props.get('instagram') or ''
    linkedin = props.get('linkedin') or ''
    return {
        'id': props.get('id') or str(node.element_id),
        'spaceId': props.get('spaceId', ''),
        'name': props.get('name', ''),
        'nickName': props.get('nickName', ''),
        'gender': props.get('gender', ''),
        'sex': props.get('sex', ''),
        'dateOfBirth': serialize_date(props.get('dateOfBirth')),
        'photoUrl': props.get('photoUrl', ''),
        'phone': props.get('phone') or '',
        'email': props.get('email') or '',
        'facebookId': facebook_id,
        'instagram': instagram,
        'linkedin': linkedin,
        'notes': props.get('notes') or '',
        'facebookUrl': facebook_profile_url(facebook_id),
        'instagramUrl': instagram_profile_url(instagram),
        'linkedinUrl': linkedin_profile_url(linkedin),
    }


def format_user(node, include_sensitive=False):
    props = dict(node)
    data = {
        'id': props.get('id'),
        'email': props.get('email'),
        'name': props.get('name', ''),
        'createdAt': props.get('createdAt'),
    }
    if include_sensitive:
        data['passwordHash'] = props.get('passwordHash')
    return data


def format_space(node, role=None):
    props = dict(node)
    data = {
        'id': props.get('id'),
        'name': props.get('name', ''),
        'description': props.get('description', ''),
        'createdAt': props.get('createdAt'),
    }
    if role is not None:
        data['role'] = role
    return data


def invite_status(props, now=None):
    """pending | used | expired | revoked."""
    now = now or datetime.now(timezone.utc)
    if props.get('revoked'):
        return 'revoked'
    if props.get('usedAt'):
        return 'used'
    expires_at = props.get('expiresAt')
    if expires_at:
        try:
            exp = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if now > exp:
                return 'expired'
        except ValueError:
            pass
    return 'pending'


def format_invite(node, created_by_name=None, created_by_email=None, include_token=None):
    from peoplegraph.config import Config

    props = dict(node)
    status = invite_status(props)
    token = props.get('token')
    show_token = include_token if include_token is not None else status == 'pending'
    data = {
        'id': props.get('id'),
        'spaceId': props.get('spaceId'),
        'role': props.get('role', 'viewer'),
        'email': props.get('email'),
        'expiresAt': props.get('expiresAt'),
        'usedAt': props.get('usedAt'),
        'createdAt': props.get('createdAt'),
        'revoked': bool(props.get('revoked', False)),
        'status': status,
        'createdByName': created_by_name or '',
        'createdByEmail': created_by_email or '',
    }
    if show_token and token:
        base = (Config.APP_PUBLIC_URL or '').rstrip('/')
        data['token'] = token
        data['invitePath'] = f'/?invite={token}'
        data['inviteUrl'] = f'{base}/?invite={token}'
    return data
