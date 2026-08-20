import os
import secrets
from uuid import uuid4

from flask import Flask, g, jsonify, request
from flask_cors import CORS

from app.database import (
    DatabaseError,
    database_backend,
    database_is_ready,
    init_db,
)
from app.routes import api_bp, pages_bp
from config import config_by_name


def create_app(config_name=None, test_config=None):
    app = Flask(__name__)

    selected_config = config_name or os.environ.get("FLASK_ENV", "default")
    config_class = config_by_name.get(
        selected_config,
        config_by_name["default"],
    )
    app.config.from_object(config_class)
    if test_config:
        app.config.update(test_config)

    CORS(app, origins=app.config["CORS_ORIGINS"])
    init_db(app)

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.before_request
    def initialize_request_context():
        g.request_id = uuid4().hex
        g.csp_nonce = secrets.token_urlsafe(18)

    @app.context_processor
    def inject_security_context():
        return {"csp_nonce": getattr(g, "csp_nonce", "")}

    @app.after_request
    def secure_employee_responses(response):
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        if request.path.startswith("/dashboard") or request.path == "/api/leads":
            response.headers["Cache-Control"] = "no-store, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "no-referrer"
            nonce = getattr(g, "csp_nonce", "")
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                f"style-src 'self' 'nonce-{nonce}'; "
                f"script-src 'self' 'nonce-{nonce}'; "
                "img-src 'self' data:; connect-src 'self'; "
                "frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
            )
        if app.config.get("SESSION_COOKIE_SECURE"):
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

    @app.errorhandler(413)
    def request_too_large(_error):
        if request.path.startswith("/api/"):
            return jsonify(
                basari=False,
                hata="İstek izin verilen boyutu aşıyor.",
            ), 413
        return "Request too large", 413

    @app.get("/health")
    def health():
        try:
            database_is_ready()
        except DatabaseError:
            return jsonify(
                basari=False,
                durum="hata",
                veritabani="erisilemiyor",
            ), 503

        return jsonify(
            basari=True,
            durum="aktif",
            veritabani="aktif",
            veritabani_turu=database_backend(),
            yapay_zeka=(
                "aktif"
                if app.config.get("GROQ_API_KEY")
                else "demo"
            ),
            yapay_zeka_saglayici=app.config.get("AI_PROVIDER"),
            yapay_zeka_modeli=app.config.get("AI_MODEL"),
        ), 200

    return app
