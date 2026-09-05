"""Auth decorators."""

from functools import wraps

from flask import g, jsonify, request

from peoplegraph.auth.jwt_utils import decode_access_token
from peoplegraph.db import get_driver
from peoplegraph.serializers import format_user


def _load_user(user_id):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            'MATCH (u:User {id: $id}) RETURN u',
            id=user_id,
        ).single()
        return format_user(record['u']) if record else None


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid Authorization header'}), 401
        token = header[7:].strip()
        try:
            payload = decode_access_token(token)
            user = _load_user(payload['sub'])
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 401
            g.user = user
        except Exception:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
        return fn(*args, **kwargs)

    return wrapper
