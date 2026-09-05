"""Space-scoped person CRUD and photo endpoints."""

import logging
import uuid

from flask import Blueprint, jsonify, request

from peoplegraph.auth.decorators import require_auth
from peoplegraph.config import Config
from peoplegraph.db import get_driver
from peoplegraph.serializers import format_person
from peoplegraph.storage import get_storage
from peoplegraph.tenancy import person_in_space, require_space_access

logger = logging.getLogger(__name__)

persons_bp = Blueprint('persons', __name__, url_prefix='/api/spaces/<space_id>/persons')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def _person_photo_url(space_id, person_id):
    node = person_in_space(person_id, space_id)
    if not node:
        return None, None
    props = dict(node)
    return node, props.get('photoUrl') or ''


@persons_bp.route('', methods=['GET'])
@require_auth
@require_space_access('viewer')
def list_persons(space_id):
    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {spaceId: $spaceId})
            RETURN p
            ORDER BY p.name
            """,
            spaceId=space_id,
        )
        persons = [format_person(r['p']) for r in result]
    return jsonify({'success': True, 'data': persons})


@persons_bp.route('/search', methods=['GET'])
@require_auth
@require_space_access('viewer')
def search_persons(space_id):
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'success': False, 'error': 'Query parameter is required'}), 400

    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {spaceId: $spaceId})
            WHERE toLower(p.name) CONTAINS toLower($query)
               OR toLower(coalesce(p.nickName, '')) CONTAINS toLower($query)
            RETURN p
            ORDER BY p.name
            LIMIT 20
            """,
            spaceId=space_id,
            query=query,
        )
        persons = [format_person(r['p']) for r in result]
    return jsonify({'success': True, 'data': persons})


@persons_bp.route('/<person_id>', methods=['GET'])
@require_auth
@require_space_access('viewer')
def get_person(space_id, person_id):
    node = person_in_space(person_id, space_id)
    if not node:
        return jsonify({'success': False, 'error': 'Person not found'}), 404
    return jsonify({'success': True, 'data': format_person(node)})


@persons_bp.route('', methods=['POST'])
@require_auth
@require_space_access('editor')
def create_person(space_id):
    data = request.get_json(silent=True) or {}
    if not data.get('name') or not data.get('gender'):
        return jsonify({'success': False, 'error': 'Name and gender are required'}), 400

    person_id = str(uuid.uuid4())
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            CREATE (p:Person {
                id: $id,
                spaceId: $spaceId,
                name: $name,
                nickName: $nickName,
                gender: $gender,
                sex: $sex,
                dateOfBirth: $dateOfBirth,
                photoUrl: $photoUrl
            })
            RETURN p
            """,
            id=person_id,
            spaceId=space_id,
            name=data.get('name'),
            nickName=data.get('nickName', ''),
            gender=data.get('gender'),
            sex=data.get('sex', ''),
            dateOfBirth=data.get('dateOfBirth', ''),
            photoUrl=data.get('photoUrl', ''),
        ).single()

    return jsonify({'success': True, 'data': format_person(record['p'])}), 201


@persons_bp.route('/<person_id>', methods=['PUT'])
@require_auth
@require_space_access('editor')
def update_person(space_id, person_id):
    data = request.get_json(silent=True) or {}
    if not person_in_space(person_id, space_id):
        return jsonify({'success': False, 'error': 'Person not found'}), 404

    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (p:Person {id: $id, spaceId: $spaceId})
            SET p.name = $name,
                p.nickName = $nickName,
                p.gender = $gender,
                p.sex = $sex,
                p.dateOfBirth = $dateOfBirth,
                p.photoUrl = $photoUrl
            RETURN p
            """,
            id=person_id,
            spaceId=space_id,
            name=data.get('name'),
            nickName=data.get('nickName', ''),
            gender=data.get('gender'),
            sex=data.get('sex', ''),
            dateOfBirth=data.get('dateOfBirth', ''),
            photoUrl=data.get('photoUrl', ''),
        ).single()

    return jsonify({'success': True, 'data': format_person(record['p'])})


@persons_bp.route('/<person_id>', methods=['DELETE'])
@require_auth
@require_space_access('editor')
def delete_person(space_id, person_id):
    node, photo_url = _person_photo_url(space_id, person_id)
    if not node:
        return jsonify({'success': False, 'error': 'Person not found'}), 404

    get_storage().delete_for_person(person_id, photo_url)
    driver = get_driver()
    with driver.session() as session:
        session.run(
            """
            MATCH (p:Person {id: $id, spaceId: $spaceId})
            DETACH DELETE p
            """,
            id=person_id,
            spaceId=space_id,
        )

    return jsonify({'success': True, 'message': 'Person deleted successfully'})


@persons_bp.route('/<person_id>/upload-photo', methods=['POST'])
@require_auth
@require_space_access('editor')
def upload_photo(space_id, person_id):
    node, old_url = _person_photo_url(space_id, person_id)
    if not node:
        return jsonify({'success': False, 'error': 'Person not found'}), 404

    if 'photo' not in request.files:
        return jsonify({'success': False, 'error': 'No photo file provided'}), 400

    file = request.files['photo']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': f'Invalid file type. Allowed: {", ".join(Config.ALLOWED_EXTENSIONS)}',
        }), 400

    storage = get_storage()
    try:
        storage.delete_for_person(person_id, old_url)
        photo_url = storage.save(file, person_id, file.filename)
    except Exception as e:
        logger.error('Photo upload storage failed: %s', e)
        return jsonify({'success': False, 'error': f'Storage error: {e}'}), 500

    driver = get_driver()
    try:
        with driver.session() as session:
            record = session.run(
                """
                MATCH (p:Person {id: $id, spaceId: $spaceId})
                SET p.photoUrl = $photoUrl
                RETURN p
                """,
                id=person_id,
                spaceId=space_id,
                photoUrl=photo_url,
            ).single()
        return jsonify({
            'success': True,
            'data': format_person(record['p']),
            'photoUrl': photo_url,
            'storage': storage.name,
        })
    except Exception as e:
        storage.delete_by_url(photo_url)
        logger.error('Photo upload DB failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@persons_bp.route('/<person_id>/delete-photo', methods=['DELETE'])
@require_auth
@require_space_access('editor')
def delete_photo(space_id, person_id):
    node, photo_url = _person_photo_url(space_id, person_id)
    if not node:
        return jsonify({'success': False, 'error': 'Person not found'}), 404

    get_storage().delete_for_person(person_id, photo_url)
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (p:Person {id: $id, spaceId: $spaceId})
            SET p.photoUrl = ''
            RETURN p
            """,
            id=person_id,
            spaceId=space_id,
        ).single()

    return jsonify({'success': True, 'data': format_person(record['p'])})
