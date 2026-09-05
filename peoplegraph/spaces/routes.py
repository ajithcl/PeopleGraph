"""Space (kinship graph tenant) routes."""

import logging
import uuid
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from peoplegraph.auth.decorators import require_auth
from peoplegraph.db import get_driver
from peoplegraph.serializers import format_space
from peoplegraph.tenancy import require_space_access

logger = logging.getLogger(__name__)

spaces_bp = Blueprint('spaces', __name__, url_prefix='/api/spaces')


def _utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


@spaces_bp.route('', methods=['GET'])
@require_auth
def list_my_spaces():
    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {id: $userId})-[m:MEMBER_OF]->(s:Space)
            RETURN s, m.role AS role
            ORDER BY s.name
            """,
            userId=g.user['id'],
        )
        spaces = [format_space(r['s'], role=r['role']) for r in result]
    return jsonify({'success': True, 'data': spaces})


@spaces_bp.route('', methods=['POST'])
@require_auth
def create_space():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'success': False, 'error': 'name is required'}), 400

    space_id = str(uuid.uuid4())
    person_id = str(uuid.uuid4())
    now = _utcnow_iso()
    driver = get_driver()
    with driver.session() as session:
        session.run(
            """
            MATCH (u:User {id: $userId})
            CREATE (s:Space {
                id: $spaceId,
                name: $name,
                description: $description,
                createdAt: $now
            })
            CREATE (u)-[:MEMBER_OF {role: 'owner', joinedAt: $now}]->(s)
            CREATE (p:Person {
                id: $personId,
                spaceId: $spaceId,
                name: $personName,
                nickName: '',
                gender: '',
                sex: '',
                dateOfBirth: '',
                photoUrl: ''
            })
            CREATE (u)-[:REPRESENTS]->(p)
            """,
            userId=g.user['id'],
            spaceId=space_id,
            name=name,
            description=(data.get('description') or '').strip(),
            now=now,
            personId=person_id,
            personName=g.user.get('name') or g.user['email'].split('@')[0],
        )

    return jsonify({
        'success': True,
        'data': {
            'id': space_id,
            'name': name,
            'role': 'owner',
            'personId': person_id,
        },
    }), 201


@spaces_bp.route('/<space_id>', methods=['GET'])
@require_auth
@require_space_access('viewer')
def get_space(space_id):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            'MATCH (s:Space {id: $spaceId}) RETURN s',
            spaceId=space_id,
        ).single()
        if not record:
            return jsonify({'success': False, 'error': 'Space not found'}), 404

        members = session.run(
            """
            MATCH (u:User)-[m:MEMBER_OF]->(s:Space {id: $spaceId})
            RETURN u.id AS id, u.email AS email, u.name AS name, m.role AS role, m.joinedAt AS joinedAt
            ORDER BY m.role, u.name
            """,
            spaceId=space_id,
        )
        member_list = [dict(r) for r in members]

    return jsonify({
        'success': True,
        'data': {
            **format_space(record['s'], role=g.space_role),
            'members': member_list,
        },
    })


@spaces_bp.route('/<space_id>', methods=['PATCH'])
@require_auth
@require_space_access('owner')
def update_space(space_id):
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    description = data.get('description')

    sets = []
    params = {'spaceId': space_id}
    if name is not None:
        sets.append('s.name = $name')
        params['name'] = name.strip()
    if description is not None:
        sets.append('s.description = $description')
        params['description'] = description.strip()

    if not sets:
        return jsonify({'success': False, 'error': 'No fields to update'}), 400

    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            f"""
            MATCH (s:Space {{id: $spaceId}})
            SET {', '.join(sets)}
            RETURN s
            """,
            **params,
        ).single()
        if not record:
            return jsonify({'success': False, 'error': 'Space not found'}), 404

    return jsonify({
        'success': True,
        'data': format_space(record['s'], role=g.space_role),
    })
