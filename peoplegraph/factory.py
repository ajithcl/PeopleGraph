"""PeopleGraph Flask application factory."""

import logging
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from peoplegraph.activity import activity_bp
from peoplegraph.auth import auth_bp
from peoplegraph.config import Config
from peoplegraph.db import close_driver, init_driver, verify_connection
from peoplegraph.graph import graph_bp, persons_bp, rel_tags_bp
from peoplegraph.invites import invites_bp, public_invites_bp
from peoplegraph.profile import profile_bp
from peoplegraph.schema import ensure_schema
from peoplegraph.spaces import spaces_bp

logger = logging.getLogger(__name__)


def create_app():
    logging.basicConfig(level=logging.INFO)
    Config.validate_secrets()

    app = Flask(__name__)
    app.config['SECRET_KEY'] = Config.SECRET_KEY
    app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH
    if Config.TRUST_PROXY:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    Path(Config.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

    CORS(
        app,
        origins=Config.CORS_ORIGINS,
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization'],
    )

    init_driver()
    if verify_connection():
        ensure_schema()

    app.register_blueprint(auth_bp)
    app.register_blueprint(spaces_bp)
    app.register_blueprint(invites_bp)
    app.register_blueprint(public_invites_bp)
    app.register_blueprint(persons_bp)
    app.register_blueprint(graph_bp)
    app.register_blueprint(rel_tags_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(activity_bp)

    dist = Config.FRONTEND_DIST
    spa_ready = dist.is_dir() and (dist / 'index.html').is_file()

    @app.route('/health', methods=['GET'])
    def health():
        from peoplegraph.email_service import smtp_configured
        from peoplegraph.storage import get_storage, storage_configured_for_s3

        storage = get_storage()
        return jsonify({
            'status': 'healthy',
            'neo4j_connected': verify_connection(),
            'phase': 7,
            'product': 'Private kinship graphs (invite-only)',
            'frontend': 'spa' if spa_ready else 'legacy-html',
            'storage': storage.name,
            's3_configured': storage_configured_for_s3(),
            'smtp_configured': smtp_configured(),
            'secrets_configured': Config.secrets_configured(),
        })

    @app.route('/')
    def index():
        if spa_ready:
            return send_from_directory(dist, 'index.html')
        return jsonify({
            'success': False,
            'error': 'SPA not built. Run: cd frontend && npm run build',
        }), 503

    @app.route('/app')
    def app_ui():
        if spa_ready:
            return send_from_directory(dist, 'index.html')
        return jsonify({
            'success': False,
            'error': 'SPA not built. Run: cd frontend && npm run build',
        }), 503

    @app.route('/legacy')
    def legacy_ui():
        return (
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>PeopleGraph</title></head><body style="font-family:system-ui;padding:2rem;max-width:36rem">'
            '<h1>The old explorer is archived</h1>'
            '<p>PeopleGraph now uses the family app at <a href="/">the home page</a>. '
            'The Babel-in-browser HTML lives in <code>legacy/family-tree-radial-v2.html</code> in the repo.</p>'
            '</body></html>'
        ), 410

    @app.route('/uploads/photos/<filename>', methods=['GET'])
    def serve_photo(filename):
        try:
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        except Exception:
            return jsonify({'success': False, 'error': 'Photo not found'}), 404

    if spa_ready:
        @app.route('/assets/<path:filename>')
        def spa_assets(filename):
            return send_from_directory(dist / 'assets', filename)

        @app.route('/<path:path>')
        def spa_fallback(path):
            # API / uploads / health have their own handlers; this is SPA client-routing only.
            if path.startswith(('api/', 'uploads/', 'health')):
                return jsonify({'success': False, 'error': 'Not found'}), 404
            candidate = dist / path
            if candidate.is_file():
                return send_from_directory(dist, path)
            return send_from_directory(dist, 'index.html')

    @app.teardown_appcontext
    def teardown(_exc):
        pass

    @app.route('/api', methods=['GET'])
    def api_index():
        return jsonify({
            'success': True,
            'message': 'PeopleGraph Phase 7 API',
            'endpoints': {
                'bootstrap': 'POST /api/auth/bootstrap',
                'register': 'POST /api/auth/register',
                'login': 'POST /api/auth/login',
                'me': 'GET|PATCH /api/auth/me',
                'spaces': 'GET|POST /api/spaces',
                'space': 'GET|PATCH /api/spaces/<spaceId>',
                'invites': 'GET|POST /api/spaces/<spaceId>/invites',
                'invite_preview': 'GET /api/invites/<token>',
                'persons': 'GET|POST /api/spaces/<spaceId>/persons',
                'relationships': 'GET|POST /api/spaces/<spaceId>/relationships',
                'relationship_tags': 'GET|POST /api/spaces/<spaceId>/relationship-tags',
                'path': 'GET /api/spaces/<spaceId>/path/<id1>/<id2>',
                'stats': 'GET /api/spaces/<spaceId>/stats',
                'profile': 'GET|POST /api/spaces/<spaceId>/profile/...',
                'activity': 'GET /api/spaces/<spaceId>/activity',
            },
        })

    return app


def shutdown():
    close_driver()
