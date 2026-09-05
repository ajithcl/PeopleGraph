"""Membership / tenancy helpers."""

from functools import wraps

from flask import g, jsonify, request

from peoplegraph.config import Config
from peoplegraph.db import get_driver


def get_membership(user_id, space_id):
    """Return role string if user is a member of space, else None."""
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (u:User {id: $userId})-[m:MEMBER_OF]->(s:Space {id: $spaceId})
            RETURN m.role AS role
            """,
            userId=user_id,
            spaceId=space_id,
        ).single()
        return record['role'] if record else None


def require_space_access(min_role='viewer'):
    """
    Decorator: requires JWT auth (g.user set) and space membership.
    Expects space_id in URL kwargs as `space_id`.
    Sets g.space_id and g.space_role.
    """
    rank = {'viewer': 1, 'editor': 2, 'owner': 3}

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not getattr(g, 'user', None):
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401

            space_id = kwargs.get('space_id') or request.view_args.get('space_id')
            if not space_id:
                return jsonify({'success': False, 'error': 'space_id required'}), 400

            role = get_membership(g.user['id'], space_id)
            if not role:
                return jsonify({'success': False, 'error': 'Forbidden: not a member of this space'}), 403

            if rank.get(role, 0) < rank.get(min_role, 0):
                return jsonify({
                    'success': False,
                    'error': f'Forbidden: requires {min_role} role or higher',
                }), 403

            g.space_id = space_id
            g.space_role = role
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def person_in_space(person_id, space_id):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (p:Person {id: $personId, spaceId: $spaceId})
            RETURN p
            """,
            personId=person_id,
            spaceId=space_id,
        ).single()
        return record['p'] if record else None
