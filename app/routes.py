import sqlite3

from flask import Blueprint, jsonify, render_template, request

from app.database import lead_ekle, tum_leadler
from app.services.ai_service import AIServiceError, ai_service


pages_bp = Blueprint("pages", __name__)
api_bp = Blueprint("api", __name__)


@pages_bp.get("/")
def index():
    return render_template("index.html")


@pages_bp.get("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@api_bp.post("/sohbet")
def sohbet():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(
            basari=False,
            hata="Geçerli bir JSON nesnesi gönderilmelidir.",
        ), 400

    mesaj = data.get("mesaj")
    if not isinstance(mesaj, str) or not mesaj.strip():
        return jsonify(
            basari=False,
            hata="Geçerli bir mesaj gönderilmelidir.",
        ), 400

    gecmis = data.get("gecmis", [])
    if gecmis is not None and not isinstance(gecmis, list):
        return jsonify(
            basari=False,
            hata="Sohbet geçmişi liste olmalıdır.",
        ), 400

    try:
        cevap = ai_service.yanit_uret(mesaj.strip(), gecmis)
    except AIServiceError:
        return jsonify(
            basari=False,
            hata="Yapay zeka hizmetine şu anda ulaşılamıyor.",
        ), 503

    return jsonify(basari=True, cevap=cevap), 200


@api_bp.post("/leads")
def lead_olustur():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(
            basari=False,
            hata="Geçerli bir JSON nesnesi gönderilmelidir.",
        ), 400

    isim = data.get("isim")
    telefon = data.get("telefon")
    mesaj = data.get("mesaj")

    if (
        not isinstance(isim, str)
        or not isim.strip()
        or not isinstance(telefon, str)
        or not telefon.strip()
    ):
        return jsonify(
            basari=False,
            hata="İsim ve telefon alanları zorunludur.",
        ), 400

    if mesaj is not None and not isinstance(mesaj, str):
        return jsonify(
            basari=False,
            hata="Mesaj metin olmalıdır.",
        ), 400

    try:
        inserted_id = lead_ekle(isim.strip(), telefon.strip(), mesaj)
    except ValueError:
        return jsonify(
            basari=False,
            hata="İsim ve telefon alanları zorunludur.",
        ), 400
    except sqlite3.Error:
        return jsonify(
            basari=False,
            hata="Kayıt işlemi şu anda tamamlanamadı.",
        ), 500

    return jsonify(basari=True, id=inserted_id), 201


@api_bp.get("/leads")
def leadleri_listele():
    try:
        leadler = tum_leadler()
    except sqlite3.Error:
        return jsonify(
            basari=False,
            hata="Kayıtlar şu anda alınamıyor.",
        ), 500

    return jsonify(basari=True, leadler=leadler), 200
