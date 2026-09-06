"""Space-scoped activity feed for kinship edits (member-only)."""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify

from peoplegraph.auth.decorators import require_auth
from peoplegraph.db import get_driver
from peoplegraph.tenancy import require_space_access

activity_bp = Blueprint('activity', __name__, url_prefix='/api/spaces/<space_id>/activity')


def _utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


def record_activity(space_id, user_id, verb, summary):
    """Append an Activity node. Safe to call after the primary write succeeds."""
    if not space_id or not summary:
        return
    driver = get_driver()
    with driver.session() as session:
        session.run(
            """
            CREATE (a:Activity {
                id: $id,
                spaceId: $spaceId,
                actorUserId: $userId,
                verb: $verb,
                summary: $summary,
                createdAt: $now
            })
            """,
            id=str(uuid.uuid4()),
            spaceId=space_id,
            userId=user_id or '',
            verb=verb or 'update',
            summary=summary,
            now=_utcnow_iso(),
        )


def space_owner_contacts(space_id, exclude_user_id=None):
    """Return [{email, name}] for owners of the space."""
    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User)-[m:MEMBER_OF]->(s:Space {id: $spaceId})
            WHERE m.role = 'owner'
            RETURN u.id AS id, u.email AS email, u.name AS name
            """,
            spaceId=space_id,
        )
        contacts = []
        for row in result:
            if exclude_user_id and row['id'] == exclude_user_id:
                continue
            if row['email']:
                contacts.append({'email': row['email'], 'name': row['name'] or ''})
        return contacts


@activity_bp.route('', methods=['GET'])
@require_auth
@require_space_access('viewer')
def list_activity(space_id):
    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (a:Activity {spaceId: $spaceId})
            OPTIONAL MATCH (u:User {id: a.actorUserId})
            RETURN a, u.name AS actorName, u.email AS actorEmail
            ORDER BY a.createdAt DESC
            LIMIT 40
            """,
            spaceId=space_id,
        )
        items = []
        for row in result:
            props = dict(row['a'])
            items.append({
                'id': props.get('id'),
                'verb': props.get('verb'),
                'summary': props.get('summary'),
                'createdAt': props.get('createdAt'),
                'actorUserId': props.get('actorUserId'),
                'actorName': row['actorName'] or row['actorEmail'] or '',
            })
    return jsonify({'success': True, 'data': items})
