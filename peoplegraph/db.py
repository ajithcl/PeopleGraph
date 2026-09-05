"""Neo4j driver lifecycle."""

import logging

from neo4j import GraphDatabase

from peoplegraph.config import Config

logger = logging.getLogger(__name__)

_driver = None


def init_driver():
    global _driver
    _driver = GraphDatabase.driver(
        Config.NEO4J_URI,
        auth=(Config.NEO4J_USER, Config.NEO4J_PASSWORD),
    )
    return _driver


def get_driver():
    if _driver is None:
        return init_driver()
    return _driver


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def verify_connection():
    try:
        driver = get_driver()
        with driver.session() as session:
            session.run('RETURN 1').single()
        logger.info('Connected to Neo4j')
        return True
    except Exception as e:
        logger.error('Failed to connect to Neo4j: %s', e)
        return False
