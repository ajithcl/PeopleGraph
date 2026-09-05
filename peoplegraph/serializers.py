"""Shared serializers and date helpers."""

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


def format_invite(node):
    props = dict(node)
    return {
        'id': props.get('id'),
        'token': props.get('token'),
        'spaceId': props.get('spaceId'),
        'role': props.get('role', 'viewer'),
        'email': props.get('email'),
        'expiresAt': props.get('expiresAt'),
        'usedAt': props.get('usedAt'),
        'createdAt': props.get('createdAt'),
        'revoked': bool(props.get('revoked', False)),
    }
