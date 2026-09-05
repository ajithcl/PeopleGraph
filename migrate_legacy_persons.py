"""
Assign legacy Person nodes (missing spaceId / UUID id) into a kinship space.

Usage:
  python migrate_legacy_persons.py --space-id <SPACE_UUID> [--dry-run]
"""

import argparse
import uuid

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from peoplegraph.db import close_driver, get_driver, init_driver, verify_connection


def main():
    parser = argparse.ArgumentParser(description='Migrate legacy Person nodes into a space')
    parser.add_argument('--space-id', required=True, help='Target Space.id UUID')
    parser.add_argument('--dry-run', action='store_true', help='Only report what would change')
    args = parser.parse_args()

    init_driver()
    if not verify_connection():
        raise SystemExit('Cannot connect to Neo4j')

    driver = get_driver()
    with driver.session() as session:
        space = session.run(
            'MATCH (s:Space {id: $id}) RETURN s',
            id=args.space_id,
        ).single()
        if not space:
            raise SystemExit(f'Space not found: {args.space_id}')

        legacy = list(session.run(
            """
            MATCH (p:Person)
            WHERE p.spaceId IS NULL OR p.spaceId = '' OR p.id IS NULL OR p.id = ''
            RETURN elementId(p) AS eid, p.name AS name, p.id AS id, p.spaceId AS spaceId
            """
        ))

        print(f'Found {len(legacy)} legacy person(s)')
        if args.dry_run:
            for row in legacy:
                print(f"  - {row['name']} id={row['id']!r} spaceId={row['spaceId']!r}")
            print('Dry run only — no changes written.')
            close_driver()
            return

        updated = 0
        for row in legacy:
            new_id = row['id'] or str(uuid.uuid4())
            session.run(
                """
                MATCH (p:Person)
                WHERE elementId(p) = $eid
                SET p.id = $id, p.spaceId = $spaceId
                """,
                eid=row['eid'],
                id=new_id,
                spaceId=args.space_id,
            )
            updated += 1
            print(f"  migrated {row['name']} -> id={new_id}")

        print(f'Done. Updated {updated} person(s) into space {args.space_id}')

    close_driver()


if __name__ == '__main__':
    main()
