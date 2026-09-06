"""Auth package — avoid importing routes here (circular with activity)."""

__all__ = ['auth_bp']


def __getattr__(name):
    if name == 'auth_bp':
        from peoplegraph.auth.routes import auth_bp
        return auth_bp
    raise AttributeError(name)
