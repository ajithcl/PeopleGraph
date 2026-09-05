"""Neo4j constraints and indexes for Phase 1 multi-tenant model."""

import logging

from peoplegraph.db import get_driver

logger = logging.getLogger(__name__)

CONSTRAINTS = [
    """
    CREATE CONSTRAINT user_id IF NOT EXISTS
    FOR (u:User) REQUIRE u.id IS UNIQUE
    """,
    """
    CREATE CONSTRAINT user_email IF NOT EXISTS
    FOR (u:User) REQUIRE u.email IS UNIQUE
    """,
    """
    CREATE CONSTRAINT space_id IF NOT EXISTS
    FOR (s:Space) REQUIRE s.id IS UNIQUE
    """,
    """
    CREATE CONSTRAINT person_id IF NOT EXISTS
    FOR (p:Person) REQUIRE p.id IS UNIQUE
    """,
    """
    CREATE CONSTRAINT invite_token IF NOT EXISTS
    FOR (i:Invite) REQUIRE i.token IS UNIQUE
    """,
]

INDEXES = [
    """
    CREATE INDEX person_space IF NOT EXISTS
    FOR (p:Person) ON (p.spaceId)
    """,
    """
    CREATE INDEX invite_space IF NOT EXISTS
    FOR (i:Invite) ON (i.spaceId)
    """,
]


def ensure_schema():
    driver = get_driver()
    with driver.session() as session:
        for cypher in CONSTRAINTS + INDEXES:
            try:
                session.run(cypher)
            except Exception as e:
                logger.warning('Schema statement skipped/failed: %s — %s', cypher.strip().splitlines()[0], e)
    logger.info('Neo4j schema constraints/indexes ensured')
