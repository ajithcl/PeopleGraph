"""
PeopleGraph — production API entrypoint (Phase 1).

Private kinship graphs with invite-only auth and multi-tenant spaces.
"""

from peoplegraph import create_app
from peoplegraph.config import Config

app = create_app()

if __name__ == '__main__':
    print('\n' + '=' * 60)
    print('PeopleGraph Phase 5 — Kinship Graph API + UI')
    print('=' * 60)
    print(f'UI:      http://localhost:{Config.PORT}/')
    print(f'API:     http://localhost:{Config.PORT}/api')
    print(f'Neo4j:   {Config.NEO4J_URI}')
    print(f'Debug:   {Config.DEBUG}')
    print('\nPhase 5: Claim who you are on the graph after invite signup')
    print('=' * 60 + '\n')

    try:
        app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
    finally:
        from peoplegraph import shutdown
        shutdown()
