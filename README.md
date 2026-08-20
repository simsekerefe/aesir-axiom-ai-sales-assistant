# AESIR AXIOM — Full-Stack Engineering Intelligence Platform

Bu depo, AESIR AXIOM'un Wix üzerinde çalışan çift dilli kurumsal frontend'ini
ve ASGARDIAN yapay zekâ/lead operasyon backend'ini tek, jüri tarafından
denetlenebilir teslim altında birleştirir. Ziyaretçi AI ile görüşebilir veya
talep bırakabilir; kayıt üretimde PostgreSQL'e yazılır ve yetkili çalışan
ASGARDIAN Control panelinden erişir.

## Canlı sistem

- Frontend: https://aesir-axio-b8ecbbfe-simsekerismetefe.wix-site-host.com/
- Teknik dossier: https://aesir-axio-b8ecbbfe-simsekerismetefe.wix-site-host.com/technical-dossier
- Backend health: https://aesir-axiom-ai-sales-assistant.onrender.com/health
- Çalışan girişi: https://aesir-axiom-ai-sales-assistant.onrender.com/dashboard/login

## Teknoloji Yığını

- Python 3.10+
- Flask
- Flask-CORS
- PostgreSQL (üretim) / SQLite (yerel geliştirme)
- SQLAlchemy 2
- Groq API (varsayılan model: `openai/gpt-oss-20b`)
- python-dotenv
- requests
- gunicorn
- Astro 5 + TypeScript
- React islands
- Wix Managed Headless, CMS ve Forms
- Tailwind CSS v4 / merkezi tasarım tokenları

## Mimari

Proje Separation of Concerns ilkesine göre ayrılmıştır:

```text
aesir-axiom-ai-sales-assistant/
├── run.py
├── config.py
├── requirements.txt
├── openapi.yaml
├── docs/
├── scripts/
├── tests/
├── frontend/           # Wix/Astro kurumsal site ve ASGARDIAN arayüzü
├── .env.example
├── .gitignore
├── README.md
└── app/
    ├── __init__.py
    ├── auth.py
    ├── database.py
    ├── routes.py
    ├── validation.py
    ├── templates/
    │   ├── index.html
    │   └── dashboard.html
    └── services/
        ├── __init__.py
        └── ai_service.py
```

- `config.py`: ortam değişkenleri ve uygulama yapılandırması
- `app/auth.py`: çalışan oturumu, rol kontrolü ve CSRF doğrulaması
- `app/database.py`: PostgreSQL/SQLite bağlantısı ve tüm veri işlemleri
- `app/routes.py`: HTTP rotaları ve istek doğrulama
- `app/validation.py`: API tür, uzunluk ve geçmiş sınırları
- `app/services/ai_service.py`: tüm yapay zekâ sağlayıcı çağrıları
- `app/__init__.py`: `create_app()` uygulama fabrikası
- `run.py`: uygulama giriş noktası
- `frontend/`: iki dil, Wix CMS, form proxy'leri, SEO ve teknik dossier

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
ASGARDIAN_EMPLOYEE_USERNAME=operator
ASGARDIAN_EMPLOYEE_PASSWORD=
CORS_ORIGINS=http://localhost:5000
FLASK_ENV=development
```

Gerçek `.env` dosyası GitHub'a yüklenmemelidir.

Frontend yerel geliştirme:

```bash
cd frontend
npm install
npm run dev
```

Frontend sunucu proxy'si için `ASGARDIAN_BACKEND_URL` değeri yalnız hosting
ortamında veya Git dışındaki `.env.local` dosyasında tanımlanır.

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
Sunucunun ve veritabanı bağlantısının aktif olduğunu doğrular; hassas bağlantı
bilgilerini açığa çıkarmadan etkin SQL altyapısını, AI sağlayıcısını, modeli ve
anahtarın aktif/demo durumunu bildirir.

### `POST /api/sohbet`
Örnek istek:

```json
{
  "mesaj": "AESIR AXIOM hangi alanlarda hizmet veriyor?",
  "gecmis": [],
  "dil": "tr"
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
Lead kayıtlarını en yeniden eskiye listeler. Yalnızca doğrulanmış `employee`
oturumu erişebilir; anonim istekler `401` alır.

### Çalışan paneli

- `GET /dashboard/login`: güvenli çalışan girişi
- `GET /dashboard`: rol korumalı lead yönetim ekranı
- `POST /dashboard/logout`: CSRF korumalı oturum kapatma

Kimlik bilgileri yalnızca ortam değişkenlerinden okunur. Kaynak kodda varsayılan
parola yoktur; iki değer de eksiksiz tanımlanmadan çalışan girişi kapalı kalır.

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
- `ASGARDIAN_EMPLOYEE_USERNAME`
- `ASGARDIAN_EMPLOYEE_PASSWORD`
- `SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`

Deploy sonrasında aşağıdaki adresin 200 yanıtı verdiğini doğrulayın:

```text
https://<render-servis-adresi>/health
```

## Güvenlik

- API anahtarları kaynak kodda tutulmaz.
- Çalışan parolası yalnızca Render'ın maskeli ortam değişkeninde tutulur.
- Lead listesi rol tabanlı oturumla korunur; dashboard yanıtları önbelleğe alınmaz.
- Form tabanlı oturum işlemleri CSRF belirteciyle doğrulanır.
- `.env` GitHub'a yüklenmez.
- SQLAlchemy Core tüm kullanıcı verilerini bağlı parametrelerle sorgular.
- Veritabanı ve AI servis hataları güvenli HTTP/JSON yanıtlarına çevrilir.
- SQL yalnızca `database.py`, AI sağlayıcı çağrıları yalnızca `ai_service.py` içinde bulunur.
- İstek gövdesi 64 KiB; mesaj, geçmiş ve lead alanları ayrıca sınırlandırılır.
- Dashboard nonce tabanlı CSP, frame koruması ve güvenli cache başlıkları taşır.

## Otomatik doğrulama

```bash
python -m unittest discover -s tests -v
python scripts/architecture_audit.py
cd frontend && npm run verify
```

Test paketi geçici SQLite üzerinde chat, model payload'ı, lead kalıcılığı,
SQL-injection benzeri veri, çalışan oturumu, CSRF, CSP ve hata yollarını kapsar.

## Teknik belgeler

- [Backend mimarisi](docs/ARCHITECTURE.md)
- [Güvenlik modeli](docs/SECURITY.md)
- [Test stratejisi](docs/TESTING.md)
- [Render dağıtımı](docs/DEPLOYMENT.md)
- [Yönerge izlenebilirliği](docs/TRACEABILITY.md)
- [OpenAPI sözleşmesi](openapi.yaml)

## Proje

AESIR AXIOM  
Engineering Intelligence  
*Engineering Beyond the Horizon*
