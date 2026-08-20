# Render Dağıtımı

## Kaynaklar

- Web service: `aesir-axiom-ai-sales-assistant`
- Database: `aesir-axiom-postgres`
- Start command: `gunicorn run:app`
- Health path: `/health`

## Ortam değişkenleri

| Değişken | Gizli | Amaç |
|---|---:|---|
| `SECRET_KEY` | Evet | Flask session imzası |
| `GROQ_API_KEY` | Evet | AI provider yetkisi |
| `ASGARDIAN_EMPLOYEE_PASSWORD` | Evet | Çalışan girişi |
| `ASGARDIAN_EMPLOYEE_USERNAME` | Hayır | Çalışan kullanıcı adı |
| `DATABASE_URL` | Evet | Render Postgres bağlantısı |
| `AI_PROVIDER` | Hayır | Sağlayıcı seçimi (`groq`) |
| `AI_MODEL` | Hayır | Model kimliği |
| `CORS_ORIGINS` | Hayır | İzinli doğrudan tarayıcı origin'leri |
| `FLASK_ENV` | Hayır | `production` çalışma profili |

`render.yaml` secret değerleri kaynak koduna koymaz; Render Dashboard'da manuel
girilecek alanları `sync: false` bırakır.

## Yayın doğrulaması

1. GitHub `main` commit'i Render deploy kaydındaki commit ile eşleştirilir.
2. `/health` 200, PostgreSQL ve AI model yapılandırması kontrol edilir.
3. `/api/sohbet` Türkçe ve İngilizce smoke testinden geçirilir.
4. Test lead'i oluşturulur, çalışan panelinde doğrulanır.
5. Anonim `/api/leads` isteğinin 401 aldığı tekrar kontrol edilir.
