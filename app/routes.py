from flask import (
    Blueprint,
    current_app,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)

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
from app.validation import (
    MAX_LEAD_MESSAGE_LENGTH,
    MAX_MESSAGE_LENGTH,
    MAX_NAME_LENGTH,
    MAX_PHONE_LENGTH,
    ValidationError,
    chat_history,
    locale,
    optional_text,
    required_text,
)


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

    try:
        mesaj = required_text(
            data.get("mesaj"),
            "Mesaj",
            MAX_MESSAGE_LENGTH,
        )
        gecmis = chat_history(data.get("gecmis", []))
        dil = locale(data.get("dil"))
    except ValidationError as exc:
        return jsonify(
            basari=False,
            hata=str(exc),
        ), 400

    try:
        cevap = ai_service.yanit_uret(mesaj, gecmis, dil=dil)
    except AIServiceError as exc:
        current_app.logger.warning(
            "ASGARDIAN provider failure: %s",
            exc.__class__.__name__,
        )
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

    try:
        isim = required_text(data.get("isim"), "İsim", MAX_NAME_LENGTH)
        telefon = required_text(
            data.get("telefon"),
            "Telefon",
            MAX_PHONE_LENGTH,
        )
        mesaj = optional_text(
            data.get("mesaj"),
            "Mesaj",
            MAX_LEAD_MESSAGE_LENGTH,
        )
    except ValidationError as exc:
        return jsonify(
            basari=False,
            hata=str(exc),
        ), 400

    try:
        inserted_id = lead_ekle(isim, telefon, mesaj)
    except ValueError:
        return jsonify(
            basari=False,
            hata="İsim ve telefon alanları zorunludur.",
        ), 400
    except DatabaseError as exc:
        current_app.logger.error(
            "Lead persistence failure: %s",
            exc.__class__.__name__,
        )
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
    except DatabaseError as exc:
        current_app.logger.error(
            "Lead listing failure: %s",
            exc.__class__.__name__,
        )
        return jsonify(
            basari=False,
            hata="Kayıtlar şu anda alınamıyor.",
        ), 500

    return jsonify(basari=True, leadler=leadler), 200
