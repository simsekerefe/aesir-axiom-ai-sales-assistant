import hmac
import secrets
from functools import wraps

from flask import current_app, jsonify, redirect, session, url_for


EMPLOYEE_ROLE = "employee"


def employee_credentials_configured() -> bool:
    """Return True only when both employee credentials are configured."""
    username = str(
        current_app.config.get("ASGARDIAN_EMPLOYEE_USERNAME", "")
    ).strip()
    password = str(
        current_app.config.get("ASGARDIAN_EMPLOYEE_PASSWORD", "")
    )
    return bool(username and password)


def authenticate_employee(username: str, password: str) -> bool:
    """Compare credentials in constant time and fail closed when unconfigured."""
    if not employee_credentials_configured():
        return False

    expected_username = str(
        current_app.config["ASGARDIAN_EMPLOYEE_USERNAME"]
    ).strip()
    expected_password = str(current_app.config["ASGARDIAN_EMPLOYEE_PASSWORD"])
    return hmac.compare_digest(username, expected_username) and hmac.compare_digest(
        password,
        expected_password,
    )


def login_employee(username: str) -> None:
    """Create a fresh, role-scoped employee session."""
    session.clear()
    session.permanent = True
    session["identity"] = username
    session["role"] = EMPLOYEE_ROLE
    session["csrf_token"] = secrets.token_urlsafe(32)


def logout_employee() -> None:
    session.clear()


def current_employee() -> str | None:
    identity = session.get("identity")
    if session.get("role") != EMPLOYEE_ROLE or not isinstance(identity, str):
        return None
    return identity


def csrf_token() -> str:
    token = session.get("csrf_token")
    if not isinstance(token, str) or not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def csrf_token_is_valid(candidate: str | None) -> bool:
    expected = session.get("csrf_token")
    return (
        isinstance(expected, str)
        and isinstance(candidate, str)
        and hmac.compare_digest(candidate, expected)
    )


def employee_page_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if current_employee() is None:
            return redirect(url_for("pages.dashboard_login"))
        return view(*args, **kwargs)

    return wrapped


def employee_api_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if current_employee() is None:
            return jsonify(
                basari=False,
                hata="Bu işlem için çalışan oturumu gereklidir.",
            ), 401
        return view(*args, **kwargs)

    return wrapped
