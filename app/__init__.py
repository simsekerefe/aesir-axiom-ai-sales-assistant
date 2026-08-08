import os

from flask import Flask, jsonify
from flask_cors import CORS

from app.database import init_db
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

    @app.get("/health")
    def health():
        return jsonify(basari=True, durum="aktif"), 200

    return app
