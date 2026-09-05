"""Invite creation and listing (invite-only onboarding)."""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from peoplegraph.auth.decorators import require_auth
from peoplegraph.config import Config
from peoplegraph.db import get_driver
from peoplegraph.email_service import send_invite_email
from peoplegraph.serializers import format_invite
from peoplegraph.tenancy import require_space_access

logger = logging.getLogger(__name__)

invites_bp = Blueprint('invites', __name__, url_prefix='/api/spaces/<space_id>/invites')


def _utcnow():
    return datetime.now(timezone.utc)


@invites_bp.route('', methods=['GET'])
@require_auth
@require_space_access('owner')
def list_invites(space_id):
    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (i:Invite {spaceId: $spaceId})
            WHERE coalesce(i.revoked, false) = false
            RETURN i
            ORDER BY i.createdAt DESC
            """,
            spaceId=space_id,
        )
        invites = [format_invite(r['i']) for r in result]
    return jsonify({'success': True, 'data': invites})


@invites_bp.route('', methods=['POST'])
@require_auth
@require_space_access('owner')
def create_invite(space_id):
    data = request.get_json(silent=True) or {}
    role = (data.get('role') or 'viewer').strip().lower()
    if role not in Config.ROLES or role == 'owner':
        # Only one bootstrap owner path; invites max editor
        if role == 'owner':
            return jsonify({'success': False, 'error': 'Cannot invite as owner'}), 400
        if role not in ('editor', 'viewer'):
            return jsonify({'success': False, 'error': f'role must be one of: editor, viewer'}), 400

    email = (data.get('email') or '').strip().lower() or None
    invite_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(24)
    now = _utcnow()
    expires = now + timedelta(days=Config.INVITE_EXPIRES_DAYS)

    driver = get_driver()
    with driver.session() as session:
        space = session.run(
            'MATCH (s:Space {id: $spaceId}) RETURN s',
            spaceId=space_id,
        ).single()
        if not space:
            return jsonify({'success': False, 'error': 'Space not found'}), 404

        session.run(
            """
            MATCH (s:Space {id: $spaceId})
            MATCH (u:User {id: $userId})
            CREATE (i:Invite {
                id: $inviteId,
                token: $token,
                spaceId: $spaceId,
                role: $role,
                email: $email,
                createdAt: $createdAt,
                expiresAt: $expiresAt,
                createdByUserId: $userId,
                revoked: false
            })
            CREATE (u)-[:CREATED_INVITE]->(i)
            CREATE (i)-[:FOR_SPACE]->(s)
            """,
            spaceId=space_id,
            userId=g.user['id'],
            inviteId=invite_id,
            token=token,
            role=role,
            email=email,
            createdAt=now.isoformat(),
            expiresAt=expires.isoformat(),
        )

        space_name = dict(space['s']).get('name') or 'Family'

    invite_path = f'/?invite={token}'
    invite_url = f'{Config.APP_PUBLIC_URL}{invite_path}'

    email_result = None
    if email:
        email_result = send_invite_email(
            to_email=email,
            space_name=space_name,
            role=role,
            invite_url=invite_url,
            inviter_name=g.user.get('name') or g.user.get('email') or '',
        )

    return jsonify({
        'success': True,
        'data': {
            'id': invite_id,
            'token': token,
            'spaceId': space_id,
            'role': role,
            'email': email,
            'expiresAt': expires.isoformat(),
            'invitePath': invite_path,
            'inviteUrl': invite_url,
            'emailDelivery': email_result,
        },
    }), 201


@invites_bp.route('/<invite_id>/revoke', methods=['POST'])
@require_auth
@require_space_access('owner')
def revoke_invite(space_id, invite_id):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (i:Invite {id: $inviteId, spaceId: $spaceId})
            SET i.revoked = true
            RETURN i
            """,
            inviteId=invite_id,
            spaceId=space_id,
        ).single()
        if not record:
            return jsonify({'success': False, 'error': 'Invite not found'}), 404

    return jsonify({'success': True, 'message': 'Invite revoked'})


# Public blueprint without space_id in path
public_invites_bp = Blueprint('public_invites', __name__, url_prefix='/api/invites')


@public_invites_bp.route('/<token>', methods=['GET'])
def public_preview_invite(token):
    return _preview_by_token(token)


def _preview_by_token(token):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (i:Invite {token: $token})
            OPTIONAL MATCH (s:Space {id: i.spaceId})
            RETURN i, s.name AS spaceName
            """,
            token=token,
        ).single()

        if not record:
            return jsonify({'success': False, 'error': 'Invite not found'}), 404

        inv = dict(record['i'])
        if inv.get('revoked') or inv.get('usedAt'):
            return jsonify({'success': False, 'error': 'Invite no longer valid'}), 400

        return jsonify({
            'success': True,
            'data': {
                'spaceId': inv.get('spaceId'),
                'spaceName': record['spaceName'],
                'role': inv.get('role'),
                'email': inv.get('email'),
                'expiresAt': inv.get('expiresAt'),
            },
        })
