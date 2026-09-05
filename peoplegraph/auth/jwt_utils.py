"""Signed access tokens via itsdangerous (ships with Flask)."""

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from peoplegraph.config import Config


def _serializer():
    return URLSafeTimedSerializer(Config.JWT_SECRET, salt='peoplegraph-auth')


def create_access_token(user_id, email):
    return _serializer().dumps({'sub': user_id, 'email': email})


def decode_access_token(token):
    max_age = Config.JWT_EXPIRES_HOURS * 3600
    try:
        return _serializer().loads(token, max_age=max_age)
    except SignatureExpired as e:
        raise ValueError('Token expired') from e
    except BadSignature as e:
        raise ValueError('Invalid token') from e
