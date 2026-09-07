"""Claim / link User to a Person in a kinship space (onboarding)."""

import logging
import uuid

from flask import Blueprint, g, jsonify, request

from peoplegraph.activity import record_activity, space_owner_contacts
from peoplegraph.auth.decorators import require_auth
from peoplegraph.db import get_driver
from peoplegraph.email_service import send_claim_notice_email
from peoplegraph.serializers import format_person, person_details_from_body
from peoplegraph.tenancy import person_in_space, require_space_access

logger = logging.getLogger(__name__)

profile_bp = Blueprint('profile', __name__, url_prefix='/api/spaces/<space_id>/profile')


def _space_name(space_id):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            'MATCH (s:Space {id: $spaceId}) RETURN s.name AS name',
            spaceId=space_id,
        ).single()
        return (record['name'] if record else None) or 'Family'


def _after_claim(space_id, person_name):
    claimant = g.user.get('name') or g.user.get('email') or 'A relative'
    record_activity(space_id, g.user['id'], 'claim', f'{claimant} is listed as {person_name}')
    space_name = _space_name(space_id)
    for owner in space_owner_contacts(space_id, exclude_user_id=g.user['id']):
        send_claim_notice_email(owner['email'], space_name, claimant, person_name)


def _claimed_person(session, user_id, space_id):
    record = session.run(
        """
        MATCH (u:User {id: $userId})-[:REPRESENTS]->(p:Person {spaceId: $spaceId})
        RETURN p
        LIMIT 1
        """,
        userId=user_id,
        spaceId=space_id,
    ).single()
    return record['p'] if record else None


def _clear_space_claims(session, user_id, space_id):
    session.run(
        """
        MATCH (u:User {id: $userId})-[r:REPRESENTS]->(p:Person {spaceId: $spaceId})
        DELETE r
        """,
        userId=user_id,
        spaceId=space_id,
    )


@profile_bp.route('/me', methods=['GET'])
@require_auth
@require_space_access('viewer')
def get_my_person(space_id):
    driver = get_driver()
    with driver.session() as session:
        person = _claimed_person(session, g.user['id'], space_id)
    return jsonify({
        'success': True,
        'data': {
            'person': format_person(person) if person else None,
            'needsClaim': person is None,
        },
    })


@profile_bp.route('/claimable', methods=['GET'])
@require_auth
@require_space_access('viewer')
def list_claimable(space_id):
    """Persons in this space not already claimed by another user."""
    search = (request.args.get('query') or '').strip()
    driver = get_driver()
    with driver.session() as session:
        if search:
            result = session.run(
                """
                MATCH (p:Person {spaceId: $spaceId})
                WHERE (toLower(p.name) CONTAINS toLower($search)
                    OR toLower(coalesce(p.nickName, '')) CONTAINS toLower($search))
                OPTIONAL MATCH (other:User)-[:REPRESENTS]->(p)
                WHERE other.id <> $userId
                WITH p, other
                WHERE other IS NULL
                OPTIONAL MATCH (p)-[]-(n:Person {spaceId: $spaceId})
                WITH p, collect(DISTINCT n.name)[0..2] AS relatedNames
                RETURN p, relatedNames
                ORDER BY p.name
                LIMIT 30
                """,
                spaceId=space_id,
                search=search,
                userId=g.user['id'],
            )
        else:
            result = session.run(
                """
                MATCH (p:Person {spaceId: $spaceId})
                OPTIONAL MATCH (other:User)-[:REPRESENTS]->(p)
                WHERE other.id <> $userId
                WITH p, other
                WHERE other IS NULL
                OPTIONAL MATCH (p)-[]-(n:Person {spaceId: $spaceId})
                WITH p, collect(DISTINCT n.name)[0..2] AS relatedNames
                RETURN p, relatedNames
                ORDER BY p.name
                LIMIT 50
                """,
                spaceId=space_id,
                userId=g.user['id'],
            )
        persons = []
        for row in result:
            payload = format_person(row['p'])
            payload['relatedNames'] = [n for n in (row['relatedNames'] or []) if n]
            persons.append(payload)
        mine = _claimed_person(session, g.user['id'], space_id)
        claimed = format_person(mine) if mine else None

    return jsonify({
        'success': True,
        'data': {
            'persons': persons,
            'claimedPersonId': claimed['id'] if claimed else None,
            'claimedPerson': claimed,
        },
    })


@profile_bp.route('/claim', methods=['POST'])
@require_auth
@require_space_access('viewer')
def claim_person(space_id):
    data = request.get_json(silent=True) or {}
    person_id = (data.get('personId') or '').strip()
    if not person_id:
        return jsonify({'success': False, 'error': 'personId is required'}), 400

    if not person_in_space(person_id, space_id):
        return jsonify({'success': False, 'error': 'Person not found in this space'}), 404

    driver = get_driver()
    with driver.session() as session:
        taken = session.run(
            """
            MATCH (other:User)-[:REPRESENTS]->(p:Person {id: $personId, spaceId: $spaceId})
            WHERE other.id <> $userId
            RETURN other.email AS email
            """,
            personId=person_id,
            spaceId=space_id,
            userId=g.user['id'],
        ).single()
        if taken:
            return jsonify({
                'success': False,
                'error': 'Someone else already claimed this person. Pick another listing, or add yourself as new.',
            }), 409

        _clear_space_claims(session, g.user['id'], space_id)
        record = session.run(
            """
            MATCH (u:User {id: $userId})
            MATCH (p:Person {id: $personId, spaceId: $spaceId})
            MERGE (u)-[:REPRESENTS]->(p)
            RETURN p
            """,
            userId=g.user['id'],
            personId=person_id,
            spaceId=space_id,
        ).single()

    person = format_person(record['p'])
    _after_claim(space_id, person.get('name') or 'a family member')
    return jsonify({
        'success': True,
        'data': person,
        'message': 'Profile claimed. This person is now you in this space.',
    })


@profile_bp.route('/claim/new', methods=['POST'])
@require_auth
@require_space_access('viewer')
def claim_new_person(space_id):
    """Create a new Person for yourself and claim it."""
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or g.user.get('name') or '').strip()
    gender = (data.get('gender') or '').strip()
    if not name:
        return jsonify({'success': False, 'error': 'name is required'}), 400
    if not gender:
        return jsonify({'success': False, 'error': 'gender is required'}), 400

    details = person_details_from_body(data)
    person_id = str(uuid.uuid4())
    driver = get_driver()
    with driver.session() as session:
        _clear_space_claims(session, g.user['id'], space_id)
        record = session.run(
            """
            MATCH (u:User {id: $userId})
            CREATE (p:Person {
                id: $personId,
                spaceId: $spaceId,
                name: $name,
                nickName: $nickName,
                gender: $gender,
                sex: $sex,
                dateOfBirth: $dateOfBirth,
                photoUrl: '',
                phone: $phone,
                email: $email,
                facebookId: $facebookId,
                instagram: $instagram,
                linkedin: $linkedin,
                notes: $notes
            })
            CREATE (u)-[:REPRESENTS]->(p)
            RETURN p
            """,
            userId=g.user['id'],
            personId=person_id,
            spaceId=space_id,
            name=name,
            nickName=data.get('nickName', ''),
            gender=gender,
            sex=data.get('sex', ''),
            dateOfBirth=data.get('dateOfBirth', ''),
            **details,
        ).single()

    person = format_person(record['p'])
    _after_claim(space_id, person.get('name') or 'a family member')
    return jsonify({
        'success': True,
        'data': person,
        'message': 'Created and claimed your profile on the graph.',
    }), 201


@profile_bp.route('/claim', methods=['DELETE'])
@require_auth
@require_space_access('viewer')
def unclaim_person(space_id):
    """Remove your claim in this space (does not delete the Person node)."""
    driver = get_driver()
    with driver.session() as session:
        _clear_space_claims(session, g.user['id'], space_id)
    return jsonify({'success': True, 'message': 'Claim removed. Choose who you are again.'})
