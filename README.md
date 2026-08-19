# AESIR AXIOM — ASGARDIAN AI Sales Assistant

ASGARDIAN, AESIR AXIOM markası için geliştirilen modüler bir Flask backend uygulamasıdır. Kullanıcı mesajlarını yapay zekâ servisine iletir, yanıt üretir ve müşteri adayı (lead) bilgilerini üretimde PostgreSQL veritabanında kalıcı olarak saklar. Yerel geliştirmede SQLite kullanılabilir.

## Teknoloji Yığını

- Python 3.9+
- Flask
- Flask-CORS
- PostgreSQL (üretim) / SQLite (yerel geliştirme)
- SQLAlchemy 2
- Groq API (varsayılan model: `openai/gpt-oss-20b`)
- python-dotenv
- requests
- gunicorn

## Mimari

Proje Separation of Concerns ilkesine göre ayrılmıştır:

```text
aesir-axiom-ai-sales-assistant/
├── run.py
├── config.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
└── app/
    ├── __init__.py
    ├── database.py
    ├── routes.py
    ├── templates/
    │   ├── index.html
    │   └── dashboard.html
    └── services/
        ├── __init__.py
        └── ai_service.py
```

- `config.py`: ortam değişkenleri ve uygulama yapılandırması
- `app/database.py`: PostgreSQL/SQLite bağlantısı ve tüm veri işlemleri
- `app/routes.py`: HTTP rotaları ve istek doğrulama
- `app/services/ai_service.py`: tüm yapay zekâ sağlayıcı çağrıları
- `app/__init__.py`: `create_app()` uygulama fabrikası
- `run.py`: uygulama giriş noktası

## Kurulum

```bash
git clone https://github.com/simsekerefe/aesir-axiom-ai-sales-assistant.git
cd aesir-axiom-ai-sales-assistant
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Ortam Değişkenleri

`.env.example` dosyasını temel alarak yerel `.env` dosyanızı oluşturun.

```env
SECRET_KEY=
DATABASE_URL=sqlite:///aesir_axiom_leads.db
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=
CORS_ORIGINS=http://localhost:5000
FLASK_ENV=development
```

Gerçek `.env` dosyası GitHub'a yüklenmemelidir.

## Çalıştırma

```bash
python run.py
```

Sunucu canlılık kontrolü:

```text
GET /health
```

## API Uç Noktaları

### `GET /health`
Sunucunun ve veritabanı bağlantısının aktif olduğunu doğrular.

### `POST /api/sohbet`
Örnek istek:

```json
{
  "mesaj": "AESIR AXIOM hangi alanlarda hizmet veriyor?",
  "gecmis": []
}
```

### `POST /api/leads`
Örnek istek:

```json
{
  "isim": "Örnek Kullanıcı",
  "telefon": "+90 5xx xxx xx xx",
  "mesaj": "Yapay zekâ destekli veri analizi çözümü hakkında bilgi istiyorum."
}
```

### `GET /api/leads`
Lead kayıtlarını en yeniden eskiye listeler.

## Render Deploy

Render Web Service ayarları:

```text
Build Command: pip install -r requirements.txt
Start Command: gunicorn run:app
```

`render.yaml`, ücretsiz Render Postgres kaynağını oluşturur ve dahili bağlantı
adresini `DATABASE_URL` değişkenine bağlar. Render ortam değişkenlerinde ayrıca
en az aşağıdaki değerler bulunmalıdır:

- `FLASK_ENV=production`
- `AI_PROVIDER=groq`
- `AI_MODEL=openai/gpt-oss-20b`
- `GROQ_API_KEY`
- `SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`

Deploy sonrasında aşağıdaki adresin 200 yanıtı verdiğini doğrulayın:

```text
https://<render-servis-adresi>/health
```

## Güvenlik

- API anahtarları kaynak kodda tutulmaz.
- `.env` GitHub'a yüklenmez.
- SQLAlchemy Core tüm kullanıcı verilerini bağlı parametrelerle sorgular.
- Veritabanı ve AI servis hataları güvenli HTTP/JSON yanıtlarına çevrilir.
- SQL yalnızca `database.py`, AI sağlayıcı çağrıları yalnızca `ai_service.py` içinde bulunur.

## Proje

AESIR AXIOM  
Engineering Intelligence  
*Engineering Beyond the Horizon*
