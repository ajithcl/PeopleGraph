"""Shared serializers and date helpers."""

from datetime import datetime, timezone

import neo4j


def serialize_date(value):
    if value is None:
        return None
    if isinstance(value, neo4j.time.Date):
        return value.to_native().isoformat()
    if isinstance(value, str):
        return value
    return str(value)


def format_person(node):
    props = dict(node)
    return {
        'id': props.get('id') or str(node.element_id),
        'spaceId': props.get('spaceId', ''),
        'name': props.get('name', ''),
        'nickName': props.get('nickName', ''),
        'gender': props.get('gender', ''),
        'sex': props.get('sex', ''),
        'dateOfBirth': serialize_date(props.get('dateOfBirth')),
        'photoUrl': props.get('photoUrl', ''),
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
