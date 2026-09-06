# Production process config for gunicorn
# Usage: gunicorn -c gunicorn.conf.py "peoplegraph:create_app()"
# Docker: see Dockerfile CMD. HTTPS is terminated by Caddy (deploy/Caddyfile).

import os

bind = f"0.0.0.0:{os.getenv('PORT', '8010')}"
workers = int(os.getenv('WEB_CONCURRENCY', '2'))
threads = int(os.getenv('GUNICORN_THREADS', '4'))
timeout = 60
keepalive = 5
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('LOG_LEVEL', 'info')
preload_app = True
