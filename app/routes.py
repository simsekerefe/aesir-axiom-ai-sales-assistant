from flask import Blueprint, jsonify, redirect, render_template, request, url_for

from app.auth import (
    authenticate_employee,
    csrf_token,
    csrf_token_is_valid,
    current_employee,
    employee_api_required,
    employee_credentials_configured,
    employee_page_required,
    login_employee,
    logout_employee,
)
from app.database import DatabaseError, lead_ekle, tum_leadler
from app.services.ai_service import AIServiceError, ai_service


pages_bp = Blueprint("pages", __name__)
api_bp = Blueprint("api", __name__)


@pages_bp.get("/")
def index():
    return render_template("index.html")


@pages_bp.route("/dashboard/login", methods=["GET", "POST"])
def dashboard_login():
    if current_employee() is not None:
        return redirect(url_for("pages.dashboard"))

    error = None
    status = 200
    configured = employee_credentials_configured()

    if request.method == "POST":
        if not csrf_token_is_valid(request.form.get("csrf_token")):
            error = "Oturum doğrulaması geçersiz. Sayfayı yenileyip tekrar deneyin."
            status = 400
        elif not configured:
            error = "Çalışan erişimi henüz güvenli biçimde yapılandırılmadı."
            status = 503
        else:
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            if authenticate_employee(username, password):
                login_employee(username)
                return redirect(url_for("pages.dashboard"))
            error = "Kullanıcı adı veya parola geçersiz."
            status = 401

    return render_template(
        "dashboard_login.html",
        csrf_token=csrf_token(),
        configured=configured,
        error=error,
    ), status


@pages_bp.get("/dashboard")
@employee_page_required
def dashboard():
    return render_template(
        "dashboard.html",
        employee=current_employee(),
        csrf_token=csrf_token(),
    )


@pages_bp.post("/dashboard/logout")
@employee_page_required
def dashboard_logout():
    if not csrf_token_is_valid(request.form.get("csrf_token")):
        return render_template(
            "dashboard.html",
            employee=current_employee(),
            csrf_token=csrf_token(),
            page_error="Oturum kapatma isteği doğrulanamadı.",
        ), 400

    logout_employee()
    return redirect(url_for("pages.dashboard_login"))


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
    except DatabaseError:
        return jsonify(
            basari=False,
            hata="Kayıt işlemi şu anda tamamlanamadı.",
        ), 500

    return jsonify(basari=True, id=inserted_id), 201


@api_bp.get("/leads")
@employee_api_required
def leadleri_listele():
    try:
        leadler = tum_leadler()
    except DatabaseError:
        return jsonify(
            basari=False,
            hata="Kayıtlar şu anda alınamıyor.",
        ), 500

    return jsonify(basari=True, leadler=leadler), 200
