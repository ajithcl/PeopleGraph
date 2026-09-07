#!/usr/bin/env python3
"""
Restore a backup created by scripts/backup.py.

This merges nodes by UUID. It does not delete extra data already in Neo4j.
Requires --yes because it writes password hashes and invites.

Usage:
  .venv/bin/python scripts/restore.py backups/20260906T120000Z --yes
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / '.env')

from peoplegraph.config import Config
from peoplegraph.db import close_driver, get_driver, init_driver, verify_connection


def main():
    parser = argparse.ArgumentParser(description='Restore a PeopleGraph backup folder')
    parser.add_argument('backup_dir', help='Timestamped folder from scripts/backup.py')
    parser.add_argument('--yes', action='store_true', help='Required confirmation')
    args = parser.parse_args()
    if not args.yes:
        raise SystemExit('Refusing to restore without --yes')

    backup = Path(args.backup_dir)
    graph_path = backup / 'graph.json'
    if not graph_path.is_file():
        raise SystemExit(f'Missing {graph_path}')

    graph = json.loads(graph_path.read_text(encoding='utf-8'))
    init_driver()
    if not verify_connection():
        raise SystemExit('Cannot connect to Neo4j')

    driver = get_driver()
    with driver.session() as session:
        for s in graph.get('spaces') or []:
            session.run(
                """
                MERGE (x:Space {id: $id})
                SET x.name = $name, x.description = $description, x.createdAt = $createdAt
                """,
                id=s.get('id'),
                name=s.get('name') or 'Family',
                description=s.get('description') or '',
                createdAt=s.get('createdAt') or '',
            )
        for u in graph.get('users') or []:
            session.run(
                """
                MERGE (x:User {id: $id})
                SET x.email = $email, x.name = $name, x.passwordHash = $passwordHash, x.createdAt = $createdAt
                """,
                **{k: u.get(k) or '' for k in ('id', 'email', 'name', 'passwordHash', 'createdAt')},
            )
        for m in graph.get('memberships') or []:
            session.run(
                """
                MATCH (u:User {id: $userId}), (s:Space {id: $spaceId})
                MERGE (u)-[rel:MEMBER_OF]->(s)
                SET rel.role = $role, rel.joinedAt = $joinedAt
                """,
                userId=m.get('userId'),
                spaceId=m.get('spaceId'),
                role=m.get('role') or 'viewer',
                joinedAt=m.get('joinedAt') or '',
            )
        for p in graph.get('persons') or []:
            session.run(
                """
                MERGE (x:Person {id: $id})
                SET x.spaceId = $spaceId, x.name = $name, x.nickName = $nickName,
                    x.gender = $gender, x.sex = $sex, x.dateOfBirth = $dateOfBirth,
                    x.photoUrl = $photoUrl, x.phone = $phone, x.email = $email,
                    x.facebookId = $facebookId, x.instagram = $instagram,
                    x.linkedin = $linkedin, x.notes = $notes
                """,
                id=p.get('id'),
                spaceId=p.get('spaceId') or '',
                name=p.get('name') or '',
                nickName=p.get('nickName') or '',
                gender=p.get('gender') or '',
                sex=p.get('sex') or '',
                dateOfBirth=p.get('dateOfBirth') or '',
                photoUrl=p.get('photoUrl') or '',
                phone=p.get('phone') or '',
                email=p.get('email') or '',
                facebookId=p.get('facebookId') or '',
                instagram=p.get('instagram') or '',
                linkedin=p.get('linkedin') or '',
                notes=p.get('notes') or '',
            )
        for rel in graph.get('relationships') or []:
            rel_type = rel.get('type') or 'FRIEND_OF'
            if not rel_type.isidentifier():
                continue
            session.run(
                f"""
                MATCH (a:Person {{id: $fromId}}), (b:Person {{id: $toId}})
                MERGE (a)-[:{rel_type}]->(b)
                """,
                fromId=rel.get('from'),
                toId=rel.get('to'),
            )
        for c in graph.get('claims') or []:
            session.run(
                """
                MATCH (u:User {id: $userId}), (p:Person {id: $personId})
                MERGE (u)-[:REPRESENTS]->(p)
                """,
                userId=c.get('userId'),
                personId=c.get('personId'),
            )
        for inv in graph.get('invites') or []:
            session.run(
                """
                MERGE (i:Invite {id: $id})
                SET i.token = $token, i.spaceId = $spaceId, i.role = $role, i.email = $email,
                    i.createdAt = $createdAt, i.expiresAt = $expiresAt,
                    i.createdByUserId = $createdByUserId, i.revoked = $revoked,
                    i.usedAt = $usedAt, i.usedByUserId = $usedByUserId
                """,
                id=inv.get('id'),
                token=inv.get('token') or '',
                spaceId=inv.get('spaceId') or '',
                role=inv.get('role') or 'viewer',
                email=inv.get('email'),
                createdAt=inv.get('createdAt') or '',
                expiresAt=inv.get('expiresAt') or '',
                createdByUserId=inv.get('createdByUserId') or '',
                revoked=bool(inv.get('revoked')),
                usedAt=inv.get('usedAt'),
                usedByUserId=inv.get('usedByUserId'),
            )
        for t in graph.get('relTags') or []:
            if not t.get('id') or not t.get('spaceId'):
                continue
            session.run(
                """
                MATCH (s:Space {id: $spaceId})
                MERGE (x:RelTag {id: $id})
                SET x.spaceId = $spaceId, x.key = $key, x.label = $label,
                    x.builtIn = $builtIn, x.phraseForward = $phraseForward,
                    x.phraseReverse = $phraseReverse
                MERGE (s)-[:HAS_REL_TAG]->(x)
                """,
                id=t.get('id') or '',
                spaceId=t.get('spaceId') or '',
                key=t.get('key') or '',
                label=t.get('label') or '',
                builtIn=bool(t.get('builtIn')),
                phraseForward=t.get('phraseForward') or '',
                phraseReverse=t.get('phraseReverse') or '',
            )

    close_driver()

    photos = backup / 'photos'
    if photos.is_dir():
        Path(Config.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
        shutil.copytree(photos, Config.UPLOAD_FOLDER, dirs_exist_ok=True)
        print(f'Restored photos into {Config.UPLOAD_FOLDER}')

    print(f'Restore from {backup} complete.')


if __name__ == '__main__':
    main()
