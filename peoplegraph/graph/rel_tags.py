"""Space-scoped relationship tag catalog (built-in + custom types)."""

import re
import uuid

from flask import Blueprint, jsonify, request

from peoplegraph.auth.decorators import require_auth
from peoplegraph.config import Config
from peoplegraph.db import get_driver
from peoplegraph.graph.path_explain import FORWARD_PHRASES, REVERSE_PHRASES
from peoplegraph.tenancy import require_space_access

rel_tags_bp = Blueprint('rel_tags', __name__, url_prefix='/api/spaces/<space_id>')

KEY_RE = re.compile(r'^[A-Z][A-Z0-9_]{0,30}$')
RESERVED_KEYS = frozenset({
    'MATCH', 'CREATE', 'DELETE', 'MERGE', 'RETURN', 'WHERE', 'WITH', 'UNWIND',
    'SET', 'REMOVE', 'CALL', 'AND', 'OR', 'NOT', 'XOR', 'TRUE', 'FALSE', 'NULL',
    'AS', 'IN', 'IS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'HAS_REL_TAG',
})

DEFAULT_BUILT_IN_LABELS = {
    'SPOUSE_OF': 'Spouse',
    'HAS_CHILD': 'Has child',
    'CHILD_OF': 'Child of',
    'SIBLING_OF': 'Sibling',
    'PARENT_OF': 'Parent of',
    'FRIEND_OF': 'Friend',
}


def is_safe_rel_key(key):
    return bool(key and KEY_RE.match(key) and key not in RESERVED_KEYS)


def label_to_key(label):
    raw = re.sub(r'[^A-Za-z0-9]+', '_', (label or '').strip()).strip('_').upper()
    if not raw:
        return ''
    if raw[0].isdigit():
        raw = 'R_' + raw
    return raw[:31]


def built_in_tag_specs():
    specs = []
    for key in Config.VALID_RELATIONSHIP_TYPES:
        specs.append({
            'key': key,
            'label': DEFAULT_BUILT_IN_LABELS.get(key, key.replace('_', ' ').title()),
            'phraseForward': FORWARD_PHRASES.get(key, '{a} is connected to {b} ({label})'),
            'phraseReverse': REVERSE_PHRASES.get(key, '{a} is connected to {b} ({label})'),
        })
    return specs


def format_rel_tag(node, usage_count=0):
    props = dict(node)
    return {
        'id': props.get('id'),
        'key': props.get('key') or '',
        'label': props.get('label') or '',
        'builtIn': bool(props.get('builtIn')),
        'phraseForward': props.get('phraseForward') or '',
        'phraseReverse': props.get('phraseReverse') or '',
        'usageCount': int(usage_count or 0),
    }


def ensure_built_in_tags(session, space_id):
    space = session.run('MATCH (s:Space {id: $id}) RETURN s', id=space_id).single()
    if not space:
        return
    for spec in built_in_tag_specs():
        session.run(
            """
            MATCH (s:Space {id: $spaceId})
            MERGE (t:RelTag {spaceId: $spaceId, key: $key})
            ON CREATE SET
                t.id = $id,
                t.label = $label,
                t.builtIn = true,
                t.phraseForward = $phraseForward,
                t.phraseReverse = $phraseReverse
            MERGE (s)-[:HAS_REL_TAG]->(t)
            """,
            spaceId=space_id,
            key=spec['key'],
            id=str(uuid.uuid4()),
            label=spec['label'],
            phraseForward=spec['phraseForward'],
            phraseReverse=spec['phraseReverse'],
        )


def usage_counts(session, space_id):
    result = session.run(
        """
        MATCH (p1:Person {spaceId: $spaceId})-[r]->(p2:Person {spaceId: $spaceId})
        RETURN type(r) AS key, count(r) AS n
        """,
        spaceId=space_id,
    )
    return {row['key']: row['n'] for row in result}


def list_tags(session, space_id):
    ensure_built_in_tags(session, space_id)
    counts = usage_counts(session, space_id)
    result = session.run(
        """
        MATCH (t:RelTag {spaceId: $spaceId})
        RETURN t
        ORDER BY t.builtIn DESC, t.label ASC
        """,
        spaceId=space_id,
    )
    tags = []
    for row in result:
        node = row['t']
        key = dict(node).get('key')
        tags.append(format_rel_tag(node, counts.get(key, 0)))
    return tags


def catalog_keys(session, space_id):
    ensure_built_in_tags(session, space_id)
    result = session.run(
        'MATCH (t:RelTag {spaceId: $spaceId}) RETURN t.key AS key',
        spaceId=space_id,
    )
    return {row['key'] for row in result if row['key']}


def phrases_for_space(session, space_id):
    ensure_built_in_tags(session, space_id)
    result = session.run(
        """
        MATCH (t:RelTag {spaceId: $spaceId})
        RETURN t.key AS key, t.phraseForward AS phraseForward,
               t.phraseReverse AS phraseReverse, t.label AS label
        """,
        spaceId=space_id,
    )
    phrases = {}
    for row in result:
        key = row['key']
        if not key:
            continue
        phrases[key] = {
            'forward': row['phraseForward'] or '',
            'reverse': row['phraseReverse'] or '',
            'label': row['label'] or key.replace('_', ' ').lower(),
        }
    return phrases


def unique_key_from_label(session, space_id, label):
    base = label_to_key(label)
    if not is_safe_rel_key(base):
        return None
    existing = catalog_keys(session, space_id)
    if base not in existing:
        return base
    for n in range(2, 100):
        suffix = f'_{n}'
        candidate = (base[: 31 - len(suffix)] + suffix)
        if is_safe_rel_key(candidate) and candidate not in existing:
            return candidate
    return None


def _tag_in_space(session, space_id, tag_id):
    record = session.run(
        'MATCH (t:RelTag {id: $id, spaceId: $spaceId}) RETURN t',
        id=tag_id,
        spaceId=space_id,
    ).single()
    return record['t'] if record else None


@rel_tags_bp.route('/relationship-tags', methods=['GET'])
@require_auth
@require_space_access('viewer')
def get_relationship_tags(space_id):
    driver = get_driver()
    with driver.session() as session:
        tags = list_tags(session, space_id)
    return jsonify({'success': True, 'data': tags})


@rel_tags_bp.route('/relationship-tags', methods=['POST'])
@require_auth
@require_space_access('editor')
def create_relationship_tag(space_id):
    data = request.get_json(silent=True) or {}
    label = (data.get('label') or '').strip()
    if not label:
        return jsonify({'success': False, 'error': 'label is required'}), 400
    phrase_forward = (data.get('phraseForward') or '').strip()
    phrase_reverse = (data.get('phraseReverse') or '').strip()

    driver = get_driver()
    with driver.session() as session:
        key = unique_key_from_label(session, space_id, label)
        if not key:
            return jsonify({'success': False, 'error': 'Could not make a safe tag key from that label'}), 400
        tag_id = str(uuid.uuid4())
        record = session.run(
            """
            MATCH (s:Space {id: $spaceId})
            CREATE (t:RelTag {
                id: $id,
                spaceId: $spaceId,
                key: $key,
                label: $label,
                builtIn: false,
                phraseForward: $phraseForward,
                phraseReverse: $phraseReverse
            })
            CREATE (s)-[:HAS_REL_TAG]->(t)
            RETURN t
            """,
            spaceId=space_id,
            id=tag_id,
            key=key,
            label=label,
            phraseForward=phrase_forward,
            phraseReverse=phrase_reverse,
        ).single()
        tag = format_rel_tag(record['t'], 0)
    return jsonify({'success': True, 'data': tag}), 201


@rel_tags_bp.route('/relationship-tags/<tag_id>', methods=['PATCH'])
@require_auth
@require_space_access('editor')
def update_relationship_tag(space_id, tag_id):
    data = request.get_json(silent=True) or {}
    driver = get_driver()
    with driver.session() as session:
        node = _tag_in_space(session, space_id, tag_id)
        if not node:
            return jsonify({'success': False, 'error': 'Tag not found'}), 404
        existing = dict(node)
        label = data['label'].strip() if 'label' in data else existing.get('label') or ''
        if not label:
            return jsonify({'success': False, 'error': 'label is required'}), 400
        phrase_forward = data['phraseForward'].strip() if 'phraseForward' in data else existing.get('phraseForward') or ''
        phrase_reverse = data['phraseReverse'].strip() if 'phraseReverse' in data else existing.get('phraseReverse') or ''
        key = existing.get('key') or ''
        if 'key' in data:
            new_key = (data.get('key') or '').strip().upper()
            if new_key != key:
                counts = usage_counts(session, space_id)
                if counts.get(key, 0):
                    return jsonify({'success': False, 'error': 'Cannot change key while links use this tag'}), 409
                if not is_safe_rel_key(new_key):
                    return jsonify({'success': False, 'error': 'Invalid tag key'}), 400
                if new_key in catalog_keys(session, space_id):
                    return jsonify({'success': False, 'error': 'That key is already used'}), 409
                key = new_key
        record = session.run(
            """
            MATCH (t:RelTag {id: $id, spaceId: $spaceId})
            SET t.label = $label,
                t.phraseForward = $phraseForward,
                t.phraseReverse = $phraseReverse,
                t.key = $key
            RETURN t
            """,
            id=tag_id,
            spaceId=space_id,
            label=label,
            phraseForward=phrase_forward,
            phraseReverse=phrase_reverse,
            key=key,
        ).single()
        counts = usage_counts(session, space_id)
        tag = format_rel_tag(record['t'], counts.get(key, 0))
    return jsonify({'success': True, 'data': tag})


@rel_tags_bp.route('/relationship-tags/<tag_id>', methods=['DELETE'])
@require_auth
@require_space_access('editor')
def delete_relationship_tag(space_id, tag_id):
    driver = get_driver()
    with driver.session() as session:
        node = _tag_in_space(session, space_id, tag_id)
        if not node:
            return jsonify({'success': False, 'error': 'Tag not found'}), 404
        props = dict(node)
        if props.get('builtIn'):
            return jsonify({'success': False, 'error': 'Built-in tags cannot be deleted'}), 409
        key = props.get('key') or ''
        counts = usage_counts(session, space_id)
        if counts.get(key, 0):
            return jsonify({'success': False, 'error': 'Remove existing links of this type first'}), 409
        session.run(
            'MATCH (t:RelTag {id: $id, spaceId: $spaceId}) DETACH DELETE t',
            id=tag_id,
            spaceId=space_id,
        )
    return jsonify({'success': True, 'message': 'Tag deleted'})
