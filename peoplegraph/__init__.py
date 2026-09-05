"""PeopleGraph package — keep imports lightweight for CLI scripts."""


def create_app():
    from peoplegraph.factory import create_app as _create_app
    return _create_app()


def shutdown():
    from peoplegraph.factory import shutdown as _shutdown
    return _shutdown()
