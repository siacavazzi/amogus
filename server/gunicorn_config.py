# Gunicorn configuration for Flask-SocketIO with eventlet
# Production-ready settings for DigitalOcean deployment

import os

# The beta copy of the app runs alongside prod with AMOGUS_CHANNEL=beta
CHANNEL = os.environ.get("AMOGUS_CHANNEL", "prod")
SUFFIX = "-beta" if CHANNEL == "beta" else ""

# Server socket
bind = "127.0.0.1:5002" if CHANNEL == "beta" else "127.0.0.1:5001"
backlog = 2048

# Worker processes
# For eventlet/gevent async workers, use only 1 worker
workers = 1
worker_class = "eventlet"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = f"/var/log/amogus/access{SUFFIX}.log"


from gunicorn.glogging import Logger  # noqa: E402


class PhotoQuietLogger(Logger):
    """Leave player photo requests out of the access log.

    A photo URL carries its filename and a connection token, and players are often kids.
    nginx already skips /selfies/ (access_log off); this keeps gunicorn's own log the same.
    """

    def access(self, resp, req, environ, request_time):
        if (environ or {}).get('PATH_INFO', '').startswith('/selfies/'):
            return
        super().access(resp, req, environ, request_time)


logger_class = PhotoQuietLogger
errorlog = f"/var/log/amogus/error{SUFFIX}.log"
loglevel = "info"
capture_output = True
enable_stdio_inheritance = True

# Process naming
proc_name = f"amogus{SUFFIX}"

# Server mechanics
daemon = False
pidfile = f"/var/run/amogus/amogus{SUFFIX}.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (handled by nginx, so disabled here)
# certfile = None
# keyfile = None

# Graceful timeout
graceful_timeout = 30

# For development, you can run with:
# gunicorn -c gunicorn_config.py app:app
