"""Auth routes: bootstrap, invite-only register, login, me."""

import logging
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from peoplegraph.activity import record_activity
from peoplegraph.auth.decorators import require_auth
from peoplegraph.auth.jwt_utils import create_access_token
from peoplegraph.auth.passwords import hash_password, verify_password
from peoplegraph.config import Config
from peoplegraph.db import get_driver
from peoplegraph.email_service import send_invite_accepted_email
from peoplegraph.serializers import format_space, format_user

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


def _user_count(session):
    return session.run('MATCH (u:User) RETURN count(u) AS c').single()['c']


@auth_bp.route('/bootstrap', methods=['POST'])
def bootstrap():
    """
    Create the first user + first kinship space.
    Only allowed when zero User nodes exist.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()
    space_name = (data.get('spaceName') or 'My Family').strip()

    if not email or not password or len(password) < 8:
        return jsonify({
            'success': False,
            'error': 'email and password (min 8 chars) are required',
        }), 400

    driver = get_driver()
    with driver.session() as session:
        if _user_count(session) > 0:
            return jsonify({
                'success': False,
                'error': 'Bootstrap disabled: users already exist. Use an invite to register.',
            }), 403

        user_id = str(uuid.uuid4())
        space_id = str(uuid.uuid4())
        person_id = str(uuid.uuid4())
        now = _utcnow_iso()

        session.run(
            """
            CREATE (u:User {
                id: $userId,
                email: $email,
                name: $name,
                passwordHash: $passwordHash,
                createdAt: $now
            })
            CREATE (s:Space {
                id: $spaceId,
                name: $spaceName,
                description: $description,
                createdAt: $now
            })
            CREATE (u)-[:MEMBER_OF {role: 'owner', joinedAt: $now}]->(s)
            CREATE (p:Person {
                id: $personId,
                spaceId: $spaceId,
                name: $name,
                nickName: '',
                gender: '',
                sex: '',
                dateOfBirth: '',
                photoUrl: ''
            })
            CREATE (u)-[:REPRESENTS]->(p)
            """,
            userId=user_id,
            email=email,
            name=name or email.split('@')[0],
            passwordHash=hash_password(password),
            spaceId=space_id,
            spaceName=space_name,
            description=data.get('spaceDescription', ''),
            personId=person_id,
            now=now,
        )

        token = create_access_token(user_id, email)
        return jsonify({
            'success': True,
            'data': {
                'token': token,
                'user': {
                    'id': user_id,
                    'email': email,
                    'name': name or email.split('@')[0],
                },
                'space': {
                    'id': space_id,
                    'name': space_name,
                    'role': 'owner',
                },
                'personId': person_id,
            },
            'message': 'Bootstrap complete. You are the owner of the first kinship space.',
        }), 201


@auth_bp.route('/register', methods=['POST'])
def register():
    """Invite-only registration."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()
    invite_token = (data.get('inviteToken') or '').strip()

    if not email or not password or len(password) < 8:
        return jsonify({
            'success': False,
            'error': 'email and password (min 8 chars) are required',
        }), 400
    if not invite_token:
        return jsonify({
            'success': False,
            'error': 'inviteToken is required. Registration is invite-only.',
        }), 400

    driver = get_driver()
    with driver.session() as session:
        invite = session.run(
            """
            MATCH (i:Invite {token: $token})
            OPTIONAL MATCH (s:Space {id: i.spaceId})
            OPTIONAL MATCH (creator:User {id: i.createdByUserId})
            RETURN i, s.name AS spaceName, creator.email AS creatorEmail, creator.name AS creatorName
            """,
            token=invite_token,
        ).single()

        if not invite:
            return jsonify({'success': False, 'error': 'Invalid invite'}), 400

        inv = dict(invite['i'])
        if inv.get('revoked') or inv.get('usedAt'):
            return jsonify({'success': False, 'error': 'Invite already used or revoked'}), 400

        expires_at = inv.get('expiresAt')
        if expires_at:
            try:
                exp = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > exp:
                    return jsonify({'success': False, 'error': 'Invite expired'}), 400
            except ValueError:
                pass

        invited_email = (inv.get('email') or '').strip().lower()
        if invited_email and invited_email != email:
            return jsonify({
                'success': False,
                'error': 'This invite is restricted to a different email address',
            }), 400

        existing = session.run(
            'MATCH (u:User {email: $email}) RETURN u',
            email=email,
        ).single()
        if existing:
            return jsonify({'success': False, 'error': 'Email already registered'}), 409

        user_id = str(uuid.uuid4())
        space_id = inv['spaceId']
        role = inv.get('role') or 'viewer'
        if role not in Config.ROLES:
            role = 'viewer'
        now = _utcnow_iso()
        display_name = name or email.split('@')[0]

        # Join space as member only — Person claim happens in onboarding (Phase 5)
        session.run(
            """
            MATCH (i:Invite {token: $token})
            MATCH (s:Space {id: $spaceId})
            CREATE (u:User {
                id: $userId,
                email: $email,
                name: $name,
                passwordHash: $passwordHash,
                createdAt: $now
            })
            CREATE (u)-[:MEMBER_OF {role: $role, joinedAt: $now}]->(s)
            SET i.usedAt = $now, i.usedByUserId = $userId
            """,
            token=invite_token,
            spaceId=space_id,
            userId=user_id,
            email=email,
            name=display_name,
            passwordHash=hash_password(password),
            role=role,
            now=now,
        )

        space_name = invite['spaceName'] or 'Family'
        creator_email = invite['creatorEmail']

    record_activity(
        space_id,
        user_id,
        'invite_accepted',
        f'{display_name} joined {space_name}',
    )
    if creator_email:
        send_invite_accepted_email(creator_email, space_name, display_name, email)

    token = create_access_token(user_id, email)
    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': {'id': user_id, 'email': email, 'name': display_name},
            'space': {'id': space_id, 'name': space_name, 'role': role},
            'personId': None,
            'needsClaim': True,
        },
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'error': 'email and password required'}), 400

    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            'MATCH (u:User {email: $email}) RETURN u',
            email=email,
        ).single()
        if not record:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        user_node = record['u']
        props = dict(user_node)
        if not verify_password(props.get('passwordHash', ''), password):
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        token = create_access_token(props['id'], props['email'])
        return jsonify({
            'success': True,
            'data': {
                'token': token,
                'user': format_user(user_node),
            },
        })


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    from flask import g

    driver = get_driver()
    with driver.session() as session:
        spaces = list(session.run(
            """
            MATCH (u:User {id: $userId})-[m:MEMBER_OF]->(s:Space)
            RETURN s, m.role AS role
            ORDER BY s.name
            """,
            userId=g.user['id'],
        ))
        space_list = [format_space(r['s'], role=r['role']) for r in spaces]

        claims = list(session.run(
            """
            MATCH (u:User {id: $userId})-[:REPRESENTS]->(p:Person)
            RETURN p.spaceId AS spaceId, p.id AS personId, p.name AS personName, p.photoUrl AS photoUrl
            """,
            userId=g.user['id'],
        ))
        claims_by_space = {
            r['spaceId']: {
                'personId': r['personId'],
                'personName': r['personName'],
                'photoUrl': r['photoUrl'] or '',
            }
            for r in claims
        }

        # Prefer query ?spaceId= for current space claim
        space_id = (request.args.get('spaceId') or '').strip()
        if not space_id and space_list:
            space_id = space_list[0]['id']

        current_claim = claims_by_space.get(space_id) if space_id else None

    return jsonify({
        'success': True,
        'data': {
            'user': g.user,
            'spaces': space_list,
            'claimsBySpace': claims_by_space,
            'personId': current_claim['personId'] if current_claim else None,
            'personName': current_claim['personName'] if current_claim else None,
            'personSpaceId': space_id if current_claim else None,
            'needsClaim': bool(space_id) and current_claim is None,
        },
    })


@auth_bp.route('/me', methods=['PATCH'])
@require_auth
def update_me():
    """Change display name, email, and/or password. Current password is required."""
    from flask import g

    data = request.get_json(silent=True) or {}
    current_password = data.get('currentPassword') or ''
    if not current_password:
        return jsonify({'success': False, 'error': 'Current password is required'}), 400

    name = data.get('name')
    email_raw = data.get('email')
    new_password = data.get('newPassword')

    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            'MATCH (u:User {id: $id}) RETURN u',
            id=g.user['id'],
        ).single()
        if not record:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        props = dict(record['u'])
        if not verify_password(props.get('passwordHash', ''), current_password):
            return jsonify({'success': False, 'error': 'Current password is incorrect'}), 403

        sets = []
        params = {'id': g.user['id']}

        if name is not None:
            name = str(name).strip()
            if not name:
                return jsonify({'success': False, 'error': 'Name cannot be empty'}), 400
            sets.append('u.name = $name')
            params['name'] = name

        if email_raw is not None:
            email = str(email_raw).strip().lower()
            if '@' not in email or '.' not in email.rsplit('@', 1)[-1]:
                return jsonify({'success': False, 'error': 'Enter a valid email address'}), 400
            if email != (props.get('email') or '').lower():
                taken = session.run(
                    """
                    MATCH (u:User {email: $email})
                    WHERE u.id <> $id
                    RETURN u
                    """,
                    email=email,
                    id=g.user['id'],
                ).single()
                if taken:
                    return jsonify({'success': False, 'error': 'That email is already registered'}), 409
                sets.append('u.email = $email')
                params['email'] = email

        if new_password:
            if len(new_password) < 8:
                return jsonify({
                    'success': False,
                    'error': 'New password must be at least 8 characters',
                }), 400
            if verify_password(props.get('passwordHash', ''), new_password):
                return jsonify({
                    'success': False,
                    'error': 'New password must be different from the current password',
                }), 400
            sets.append('u.passwordHash = $passwordHash')
            params['passwordHash'] = hash_password(new_password)

        if not sets:
            return jsonify({
                'success': False,
                'error': 'Nothing to update. Change name, email, or password.',
            }), 400

        updated = session.run(
            f"""
            MATCH (u:User {{id: $id}})
            SET {', '.join(sets)}
            RETURN u
            """,
            **params,
        ).single()

    user = format_user(updated['u'])
    token = create_access_token(user['id'], user['email'])
    return jsonify({
        'success': True,
        'data': {
            'user': user,
            'token': token,
        },
        'message': 'Account updated.',
    })


def g_user_id():
    from flask import g
    return g.user['id']
