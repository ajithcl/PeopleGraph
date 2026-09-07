"""API tests for invite-only register, space isolation, and claim rules.

Uses the live Neo4j from `.env`. Creates a throwaway space named SCRUM26-* and
deletes it afterwards. Skips if the owner smoke account is not present.
"""

import os
import uuid

import pytest

from peoplegraph.db import get_driver

OWNER_EMAIL = os.getenv('PEOPLEGRAPH_TEST_OWNER_EMAIL', 'owner@peoplegraph.local')
OWNER_PASSWORD = os.getenv('PEOPLEGRAPH_TEST_OWNER_PASSWORD', 'password123')


@pytest.fixture
def client():
    from peoplegraph import create_app

    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as test_client:
        yield test_client


def _json(response):
    return response.get_json(silent=True) or {}


def _auth(token, space_id=None):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    return headers


def _cleanup(space_id, emails):
    driver = get_driver()
    with driver.session() as session:
        session.run('MATCH (a:Activity {spaceId: $id}) DETACH DELETE a', id=space_id)
        session.run('MATCH (i:Invite {spaceId: $id}) DETACH DELETE i', id=space_id)
        session.run('MATCH (t:RelTag {spaceId: $id}) DETACH DELETE t', id=space_id)
        session.run('MATCH (p:Person {spaceId: $id}) DETACH DELETE p', id=space_id)
        session.run(
            """
            MATCH (u:User)-[m:MEMBER_OF]->(s:Space {id: $id})
            DELETE m
            """,
            id=space_id,
        )
        session.run('MATCH (s:Space {id: $id}) DETACH DELETE s', id=space_id)
        for email in emails:
            session.run(
                """
                MATCH (u:User {email: $email})
                WHERE NOT (u)-[:MEMBER_OF]->(:Space)
                DETACH DELETE u
                """,
                email=email,
            )


def test_register_requires_invite(client):
    response = client.post(
        '/api/auth/register',
        json={
            'email': f'scrum26-{uuid.uuid4().hex[:8]}@peoplegraph.test',
            'password': 'password123',
            'name': 'No Invite',
        },
    )
    assert response.status_code == 400
    body = _json(response)
    assert body.get('success') is False
    assert 'invite' in (body.get('error') or '').lower()


def test_space_isolation_and_claim_rules(client):
    login = client.post('/api/auth/login', json={'email': OWNER_EMAIL, 'password': OWNER_PASSWORD})
    if login.status_code != 200 or not _json(login).get('success'):
        pytest.skip('Owner smoke account is not available for integration tests')

    owner_token = _json(login)['data']['token']
    stamp = uuid.uuid4().hex[:8]
    space_name = f'SCRUM26-test-{stamp}'
    created = client.post(
        '/api/spaces',
        headers=_auth(owner_token),
        json={'name': space_name, 'description': 'automated test space'},
    )
    assert created.status_code == 201, created.get_data(as_text=True)
    space_id = _json(created)['data']['id']
    emails = []

    try:
        person_a = client.post(
            f'/api/spaces/{space_id}/persons',
            headers=_auth(owner_token),
            json={'name': f'Cousin A {stamp}', 'gender': 'female', 'nickName': 'A'},
        )
        person_b = client.post(
            f'/api/spaces/{space_id}/persons',
            headers=_auth(owner_token),
            json={'name': f'Cousin B {stamp}', 'gender': 'male', 'nickName': 'B'},
        )
        assert person_a.status_code == 201
        assert person_b.status_code == 201
        id_a = _json(person_a)['data']['id']
        id_b = _json(person_b)['data']['id']

        invite_a = client.post(
            f'/api/spaces/{space_id}/invites',
            headers=_auth(owner_token),
            json={'role': 'viewer', 'email': f'scrum26-a-{stamp}@peoplegraph.test'},
        )
        invite_b = client.post(
            f'/api/spaces/{space_id}/invites',
            headers=_auth(owner_token),
            json={'role': 'viewer', 'email': f'scrum26-b-{stamp}@peoplegraph.test'},
        )
        assert invite_a.status_code == 201
        assert invite_b.status_code == 201
        token_a = _json(invite_a)['data']['token']
        token_b = _json(invite_b)['data']['token']

        email_a = f'scrum26-a-{stamp}@peoplegraph.test'
        email_b = f'scrum26-b-{stamp}@peoplegraph.test'
        emails = [email_a, email_b]

        reg_a = client.post(
            '/api/auth/register',
            json={'email': email_a, 'password': 'password123', 'name': 'Tester A', 'inviteToken': token_a},
        )
        reg_b = client.post(
            '/api/auth/register',
            json={'email': email_b, 'password': 'password123', 'name': 'Tester B', 'inviteToken': token_b},
        )
        assert reg_a.status_code == 201, reg_a.get_data(as_text=True)
        assert reg_b.status_code == 201, reg_b.get_data(as_text=True)
        user_a = _json(reg_a)['data']['token']
        user_b = _json(reg_b)['data']['token']

        claim_a = client.post(
            f'/api/spaces/{space_id}/profile/claim',
            headers=_auth(user_a),
            json={'personId': id_a},
        )
        assert claim_a.status_code == 200, claim_a.get_data(as_text=True)

        steal = client.post(
            f'/api/spaces/{space_id}/profile/claim',
            headers=_auth(user_b),
            json={'personId': id_a},
        )
        assert steal.status_code == 409

        switch = client.post(
            f'/api/spaces/{space_id}/profile/claim',
            headers=_auth(user_a),
            json={'personId': id_b},
        )
        assert switch.status_code == 200
        mine = client.get(f'/api/spaces/{space_id}/profile/me', headers=_auth(user_a))
        assert _json(mine)['data']['person']['id'] == id_b

        owner_spaces = client.get('/api/spaces', headers=_auth(owner_token))
        other = next((s for s in _json(owner_spaces).get('data') or [] if s['id'] != space_id), None)
        if other:
            isolated = client.get(f'/api/spaces/{other["id"]}/persons', headers=_auth(user_a))
            assert isolated.status_code == 403
    finally:
        _cleanup(space_id, emails)


def test_change_account_credentials(client):
    login = client.post('/api/auth/login', json={'email': OWNER_EMAIL, 'password': OWNER_PASSWORD})
    if login.status_code != 200 or not _json(login).get('success'):
        pytest.skip('Owner smoke account is not available for integration tests')

    owner_token = _json(login)['data']['token']
    stamp = uuid.uuid4().hex[:8]
    created = client.post(
        '/api/spaces',
        headers=_auth(owner_token),
        json={'name': f'SCRUM26-acct-{stamp}'},
    )
    assert created.status_code == 201
    space_id = _json(created)['data']['id']
    email = f'scrum26-acct-{stamp}@peoplegraph.test'
    new_email = f'scrum26-acct-new-{stamp}@peoplegraph.test'

    try:
        invite = client.post(
            f'/api/spaces/{space_id}/invites',
            headers=_auth(owner_token),
            json={'role': 'viewer', 'email': email},
        )
        assert invite.status_code == 201
        token = _json(invite)['data']['token']
        registered = client.post(
            '/api/auth/register',
            json={'email': email, 'password': 'password123', 'name': 'Acct Tester', 'inviteToken': token},
        )
        assert registered.status_code == 201
        user_token = _json(registered)['data']['token']

        wrong = client.patch(
            '/api/auth/me',
            headers=_auth(user_token),
            json={'currentPassword': 'nope-nope', 'name': 'Hacker'},
        )
        assert wrong.status_code == 403

        taken = client.patch(
            '/api/auth/me',
            headers=_auth(user_token),
            json={'currentPassword': 'password123', 'email': OWNER_EMAIL},
        )
        assert taken.status_code == 409

        updated = client.patch(
            '/api/auth/me',
            headers=_auth(user_token),
            json={
                'currentPassword': 'password123',
                'name': 'Acct Tester Two',
                'email': new_email,
                'newPassword': 'password456',
            },
        )
        assert updated.status_code == 200, updated.get_data(as_text=True)
        body = _json(updated)['data']
        assert body['user']['email'] == new_email
        assert body['user']['name'] == 'Acct Tester Two'
        assert body.get('token')

        old_login = client.post('/api/auth/login', json={'email': email, 'password': 'password123'})
        assert old_login.status_code == 401
        new_login = client.post('/api/auth/login', json={'email': new_email, 'password': 'password456'})
        assert new_login.status_code == 200
        assert _json(new_login)['success'] is True
    finally:
        _cleanup(space_id, [email, new_email])


def test_relationship_tag_catalog(client):
    login = client.post('/api/auth/login', json={'email': OWNER_EMAIL, 'password': OWNER_PASSWORD})
    if login.status_code != 200 or not _json(login).get('success'):
        pytest.skip('Owner smoke account is not available for integration tests')

    owner_token = _json(login)['data']['token']
    stamp = uuid.uuid4().hex[:8]
    created = client.post(
        '/api/spaces',
        headers=_auth(owner_token),
        json={'name': f'SCRUM-reltags-{stamp}'},
    )
    assert created.status_code == 201
    space_id = _json(created)['data']['id']
    headers = _auth(owner_token)

    try:
        listed = client.get(f'/api/spaces/{space_id}/relationship-tags', headers=headers)
        assert listed.status_code == 200
        keys = {t['key'] for t in _json(listed).get('data') or []}
        assert 'HAS_CHILD' in keys
        assert 'FRIEND_OF' in keys

        created_tag = client.post(
            f'/api/spaces/{space_id}/relationship-tags',
            headers=headers,
            json={
                'label': 'Cousin',
                'phraseForward': '{a} is a cousin of {b}',
                'phraseReverse': '{a} is a cousin of {b}',
            },
        )
        assert created_tag.status_code == 201, created_tag.get_data(as_text=True)
        tag = _json(created_tag)['data']
        assert tag['key'] == 'COUSIN'
        assert tag['builtIn'] is False

        person_a = client.post(
            f'/api/spaces/{space_id}/persons',
            headers=headers,
            json={'name': f'Tag A {stamp}', 'gender': 'female'},
        )
        person_b = client.post(
            f'/api/spaces/{space_id}/persons',
            headers=headers,
            json={'name': f'Tag B {stamp}', 'gender': 'male'},
        )
        assert person_a.status_code == 201
        assert person_b.status_code == 201
        id_a = _json(person_a)['data']['id']
        id_b = _json(person_b)['data']['id']

        unknown = client.post(
            f'/api/spaces/{space_id}/relationships',
            headers=headers,
            json={'fromId': id_a, 'toId': id_b, 'type': 'NOT_A_TAG'},
        )
        assert unknown.status_code == 400

        linked = client.post(
            f'/api/spaces/{space_id}/relationships',
            headers=headers,
            json={'fromId': id_a, 'toId': id_b, 'type': 'COUSIN'},
        )
        assert linked.status_code == 201, linked.get_data(as_text=True)

        in_use = client.delete(f'/api/spaces/{space_id}/relationship-tags/{tag["id"]}', headers=headers)
        assert in_use.status_code == 409

        client.delete(
            f'/api/spaces/{space_id}/relationships',
            headers=headers,
            json={'fromId': id_a, 'toId': id_b, 'type': 'COUSIN'},
        )
        unused = client.post(
            f'/api/spaces/{space_id}/relationship-tags',
            headers=headers,
            json={'label': 'Godparent'},
        )
        assert unused.status_code == 201
        god_id = _json(unused)['data']['id']
        deleted = client.delete(f'/api/spaces/{space_id}/relationship-tags/{god_id}', headers=headers)
        assert deleted.status_code == 200
    finally:
        _cleanup(space_id, [])

