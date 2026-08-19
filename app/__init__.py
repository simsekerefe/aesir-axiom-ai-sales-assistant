import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from app.database import (
    DatabaseError,
    database_backend,
    database_is_ready,
    init_db,
)
from app.routes import api_bp, pages_bp
from config import config_by_name


def create_app(config_name=None):
    app = Flask(__name__)

    selected_config = config_name or os.environ.get("FLASK_ENV", "default")
    config_class = config_by_name.get(
        selected_config,
        config_by_name["default"],
    )
    app.config.from_object(config_class)

    CORS(app, origins=app.config["CORS_ORIGINS"])
    init_db(app)

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.after_request
    def secure_employee_responses(response):
        if request.path.startswith("/dashboard") or request.path == "/api/leads":
            response.headers["Cache-Control"] = "no-store, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "no-referrer"
        return response

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
        ), 200

    return app
