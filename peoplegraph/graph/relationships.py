"""Space-scoped relationships, path, and stats."""

import logging

from flask import Blueprint, g, jsonify, request

from peoplegraph.activity import record_activity
from peoplegraph.auth.decorators import require_auth
from peoplegraph.db import get_driver
from peoplegraph.graph.path_explain import build_path_explanation
from peoplegraph.graph.rel_tags import catalog_keys, is_safe_rel_key, phrases_for_space
from peoplegraph.serializers import format_person
from peoplegraph.tenancy import person_in_space, require_space_access

logger = logging.getLogger(__name__)

graph_bp = Blueprint('graph', __name__, url_prefix='/api/spaces/<space_id>')


@graph_bp.route('/relationships', methods=['GET'])
@require_auth
@require_space_access('viewer')
def list_relationships(space_id):
    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p1:Person {spaceId: $spaceId})-[r]->(p2:Person {spaceId: $spaceId})
            RETURN p1.id AS fromId, p2.id AS toId, type(r) AS type
            """,
            spaceId=space_id,
        )
        relationships = [
            {'from': r['fromId'], 'to': r['toId'], 'type': r['type']}
            for r in result
        ]
    return jsonify({'success': True, 'data': relationships})


@graph_bp.route('/relationships', methods=['POST'])
@require_auth
@require_space_access('editor')
def create_relationship(space_id):
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ('fromId', 'toId', 'type')):
        return jsonify({'success': False, 'error': 'fromId, toId, and type are required'}), 400

    rel_type = data['type']
    if not is_safe_rel_key(rel_type):
        return jsonify({'success': False, 'error': 'Invalid relationship type'}), 400

    if not person_in_space(data['fromId'], space_id) or not person_in_space(data['toId'], space_id):
        return jsonify({'success': False, 'error': 'One or both persons not found in this space'}), 404

    driver = get_driver()
    with driver.session() as session:
        allowed = catalog_keys(session, space_id)
        if rel_type not in allowed:
            return jsonify({
                'success': False,
                'error': 'Unknown relationship tag. Add it under Tags first.',
            }), 400
        query = f"""
            MATCH (p1:Person {{id: $fromId, spaceId: $spaceId}})
            MATCH (p2:Person {{id: $toId, spaceId: $spaceId}})
            CREATE (p1)-[r:{rel_type}]->(p2)
            RETURN p1.id AS fromId, p2.id AS toId, type(r) AS type
        """
        record = session.run(
            query,
            fromId=data['fromId'],
            toId=data['toId'],
            spaceId=space_id,
        ).single()

    actor = g.user.get('name') or g.user.get('email') or 'A member'
    rel_label = record['type'].replace('_', ' ').lower()
    record_activity(
        space_id,
        g.user['id'],
        'relationship_linked',
        f'{actor} linked a {rel_label} relationship',
    )
    return jsonify({
        'success': True,
        'data': {
            'from': record['fromId'],
            'to': record['toId'],
            'type': record['type'],
        },
    }), 201


@graph_bp.route('/relationships', methods=['DELETE'])
@require_auth
@require_space_access('editor')
def delete_relationship(space_id):
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ('fromId', 'toId', 'type')):
        return jsonify({'success': False, 'error': 'fromId, toId, and type are required'}), 400

    rel_type = data['type']
    if not is_safe_rel_key(rel_type):
        return jsonify({'success': False, 'error': 'Invalid relationship type'}), 400

    query = f"""
        MATCH (p1:Person {{id: $fromId, spaceId: $spaceId}})
              -[r:{rel_type}]->
              (p2:Person {{id: $toId, spaceId: $spaceId}})
        DELETE r
        RETURN count(r) AS deleted
    """
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            query,
            fromId=data['fromId'],
            toId=data['toId'],
            spaceId=space_id,
        ).single()
        deleted = record['deleted'] if record else 0

    if not deleted:
        return jsonify({'success': False, 'error': 'Relationship not found'}), 404

    return jsonify({'success': True, 'message': 'Relationship deleted'})


@graph_bp.route('/path/<id1>/<id2>', methods=['GET'])
@require_auth
@require_space_access('viewer')
def find_path(space_id, id1, id2):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (p1:Person {id: $id1, spaceId: $spaceId})
            MATCH (p2:Person {id: $id2, spaceId: $spaceId})
            MATCH path = shortestPath((p1)-[*]-(p2))
            WHERE ALL(n IN nodes(path) WHERE n:Person AND n.spaceId = $spaceId)
            WITH path, nodes(path) AS ns, relationships(path) AS rs
            RETURN
                [n IN ns | n.id] AS nodeIds,
                [n IN ns | n.name] AS nodeNames,
                [r IN rs | type(r)] AS relationshipTypes,
                [r IN rs | startNode(r).id] AS relStartIds,
                length(path) AS pathLength
            """,
            id1=id1,
            id2=id2,
            spaceId=space_id,
        ).single()

        if not record:
            return jsonify({'success': True, 'data': None, 'message': 'No path found'})

        phrases = phrases_for_space(session, space_id)
        node_ids = record['nodeIds']
        node_names = record['nodeNames']
        rel_types = record['relationshipTypes']
        rel_starts = record['relStartIds']

        steps = []
        for i, rel_type in enumerate(rel_types):
            left_id = node_ids[i]
            right_id = node_ids[i + 1]
            outgoing = rel_starts[i] == left_id
            steps.append({
                'fromId': left_id,
                'toId': right_id,
                'fromName': node_names[i],
                'toName': node_names[i + 1],
                'type': rel_type,
                'outgoing': outgoing,
            })

        explanation = build_path_explanation(steps, phrases=phrases)

        return jsonify({
            'success': True,
            'data': {
                'nodeIds': node_ids,
                'nodeNames': node_names,
                'relationshipTypes': rel_types,
                'length': record['pathLength'],
                'steps': steps,
                'explanation': explanation,
            },
        })


@graph_bp.route('/stats', methods=['GET'])
@require_auth
@require_space_access('viewer')
def stats(space_id):
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (p:Person {spaceId: $spaceId})
            OPTIONAL MATCH (p)-[r]-(other:Person {spaceId: $spaceId})
            RETURN
                count(DISTINCT p) AS totalPersons,
                count(DISTINCT CASE WHEN p.gender = 'male' THEN p END) AS maleCount,
                count(DISTINCT CASE WHEN p.gender = 'female' THEN p END) AS femaleCount,
                count(DISTINCT r) AS totalRelationships
            """,
            spaceId=space_id,
        ).single()

    return jsonify({
        'success': True,
        'data': {
            'totalPersons': record['totalPersons'],
            'maleCount': record['maleCount'],
            'femaleCount': record['femaleCount'],
            'totalRelationships': record['totalRelationships'],
        },
    })


@graph_bp.route('/persons/<person_id>/relationships', methods=['GET'])
@require_auth
@require_space_access('viewer')
def person_relationships(space_id, person_id):
    if not person_in_space(person_id, space_id):
        return jsonify({'success': False, 'error': 'Person not found'}), 404

    driver = get_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p1:Person {id: $id, spaceId: $spaceId})-[r]-(p2:Person {spaceId: $spaceId})
            RETURN p1.id AS person1Id,
                   p2.id AS person2Id,
                   type(r) AS type,
                   p2 AS relatedPerson,
                   CASE WHEN startNode(r) = p1 THEN 'outgoing' ELSE 'incoming' END AS direction
            """,
            id=person_id,
            spaceId=space_id,
        )
        relationships = [
            {
                'personId': r['person1Id'],
                'relatedPersonId': r['person2Id'],
                'relatedPerson': format_person(r['relatedPerson']),
                'type': r['type'],
                'direction': r['direction'],
                'fromId': r['person1Id'] if r['direction'] == 'outgoing' else r['person2Id'],
                'toId': r['person2Id'] if r['direction'] == 'outgoing' else r['person1Id'],
            }
            for r in result
        ]
    return jsonify({'success': True, 'data': relationships})
