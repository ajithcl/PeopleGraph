#!/usr/bin/env python3
"""
Backup PeopleGraph Neo4j data and local photo files.

Usage:
  .venv/bin/python scripts/backup.py
  .venv/bin/python scripts/backup.py --out backups/

Photos on S3/R2 are not copied (they already live off-box). The manifest records
the storage backend so you know whether to restore files.
"""

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / '.env')

from peoplegraph.config import Config
from peoplegraph.db import close_driver, get_driver, init_driver, verify_connection
from peoplegraph.storage import storage_configured_for_s3


def _dump(session):
    spaces = [dict(r['s']) for r in session.run('MATCH (s:Space) RETURN s')]
    users = []
    for r in session.run('MATCH (u:User) RETURN u'):
        props = dict(r['u'])
        users.append({
            'id': props.get('id'),
            'email': props.get('email'),
            'name': props.get('name'),
            'passwordHash': props.get('passwordHash'),
            'createdAt': props.get('createdAt'),
        })
    memberships = [
        {
            'userId': r['userId'],
            'spaceId': r['spaceId'],
            'role': r['role'],
            'joinedAt': r['joinedAt'],
        }
        for r in session.run(
            """
            MATCH (u:User)-[m:MEMBER_OF]->(s:Space)
            RETURN u.id AS userId, s.id AS spaceId, m.role AS role, m.joinedAt AS joinedAt
            """
        )
    ]
    persons = [dict(r['p']) for r in session.run('MATCH (p:Person) RETURN p')]
    relationships = [
        {'from': r['fromId'], 'to': r['toId'], 'type': r['type']}
        for r in session.run(
            """
            MATCH (a:Person)-[rel]->(b:Person)
            WHERE a.id IS NOT NULL AND b.id IS NOT NULL
            RETURN a.id AS fromId, b.id AS toId, type(rel) AS type
            """
        )
    ]
    claims = [
        {'userId': r['userId'], 'personId': r['personId']}
        for r in session.run(
            """
            MATCH (u:User)-[:REPRESENTS]->(p:Person)
            RETURN u.id AS userId, p.id AS personId
            """
        )
    ]
    invites = [dict(r['i']) for r in session.run('MATCH (i:Invite) RETURN i')]
    rel_tags = [dict(r['t']) for r in session.run('MATCH (t:RelTag) RETURN t')]
    return {
        'spaces': spaces,
        'users': users,
        'memberships': memberships,
        'persons': persons,
        'relationships': relationships,
        'claims': claims,
        'invites': invites,
        'relTags': rel_tags,
    }


def main():
    parser = argparse.ArgumentParser(description='Backup PeopleGraph graph + local photos')
    parser.add_argument('--out', default=str(ROOT / 'backups'), help='Parent directory for timestamped backups')
    args = parser.parse_args()

    init_driver()
    if not verify_connection():
        raise SystemExit('Cannot connect to Neo4j')

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    dest = Path(args.out) / stamp
    dest.mkdir(parents=True, exist_ok=True)

    driver = get_driver()
    with driver.session() as session:
        graph = _dump(session)
    close_driver()

    graph_path = dest / 'graph.json'
    graph_path.write_text(json.dumps(graph, indent=2, default=str), encoding='utf-8')

    photos_copied = 0
    photos_dir = Path(Config.UPLOAD_FOLDER)
    if photos_dir.is_dir() and not storage_configured_for_s3():
        target = dest / 'photos'
        shutil.copytree(photos_dir, target, dirs_exist_ok=True)
        photos_copied = sum(1 for p in target.rglob('*') if p.is_file())

    manifest = {
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'neo4jUri': Config.NEO4J_URI,
        'storage': 's3' if storage_configured_for_s3() else 'local',
        'counts': {k: len(v) for k, v in graph.items()},
        'photosCopied': photos_copied,
        'note': 'Keep this folder private — it includes password hashes.',
    }
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

    print(f'Backup written to {dest}')
    print(json.dumps(manifest['counts'], indent=2))
    print(f'Local photos copied: {photos_copied}')


if __name__ == '__main__':
    main()
