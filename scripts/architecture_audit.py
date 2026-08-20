"""Static delivery checks that turn the project rubric into executable proof."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


python_files = list(APP.rglob("*.py"))
source_by_path = {
    path.relative_to(ROOT).as_posix(): path.read_text(encoding="utf-8")
    for path in python_files
}
all_source = "\n".join(source_by_path.values())
delivery_source = all_source + "\n" + "\n".join(
    path.read_text(encoding="utf-8")
    for path in (ROOT / "frontend" / "src").rglob("*")
    if path.is_file() and path.suffix in {".astro", ".ts", ".tsx", ".css"}
) if (ROOT / "frontend" / "src").exists() else all_source

checks = [
    (
        "Zorunlu katman dosyaları",
        all(
            (ROOT / path).exists()
            for path in [
                "app/database.py",
                "app/routes.py",
                "app/services/ai_service.py",
                "app/validation.py",
                "app/auth.py",
                "openapi.yaml",
                "tests/test_app.py",
                "frontend/package.json",
                "frontend/src/pages/technical-dossier.astro",
            ]
        ),
    ),
    (
        "SQL/veri erişimi yalnız database.py",
        all(
            not re.search(r"\b(create_engine|select|insert|UPDATE|DELETE FROM)\b", source)
            for path, source in source_by_path.items()
            if path != "app/database.py"
        ),
    ),
    (
        "AI HTTP çağrısı yalnız ai_service.py",
        all(
            "requests.post" not in source
            for path, source in source_by_path.items()
            if path != "app/services/ai_service.py"
        ),
    ),
    (
        "Routes içinde sağlayıcı/SQL bağımlılığı yok",
        "sqlalchemy" not in read("app/routes.py")
        and "requests" not in read("app/routes.py")
        and "api.groq.com" not in read("app/routes.py"),
    ),
    (
        "Merkezi giriş sınırları",
        all(
            token in read("app/validation.py")
            for token in [
                "MAX_MESSAGE_LENGTH",
                "MAX_HISTORY_ITEMS",
                "MAX_NAME_LENGTH",
                "MAX_PHONE_LENGTH",
            ]
        ),
    ),
    (
        "Çalışan paneli session + CSRF korumalı",
        "employee_page_required" in read("app/routes.py")
        and "csrf_token_is_valid" in read("app/routes.py")
        and "noindex,nofollow" in read("app/templates/dashboard.html"),
    ),
    (
        "Kaynak kodda Groq anahtarı yok",
        re.search(r"gsk_[A-Za-z0-9_-]{12,}", delivery_source) is None,
    ),
    (
        "Ortam dosyası Git dışında",
        ".env" in read(".gitignore")
        and not (ROOT / ".env").exists()
        and not (ROOT / "frontend" / ".env.local").exists(),
    ),
]

failed = 0
for name, passed in checks:
    print(f"{'PASS' if passed else 'FAIL'}  {name}")
    failed += int(not passed)

print(f"\n{len(checks) - failed}/{len(checks)} mimari kontrol başarılı.")
sys.exit(1 if failed else 0)
