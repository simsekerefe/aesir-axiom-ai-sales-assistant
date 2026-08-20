# Güvenlik Modeli

## Korunan varlıklar

- Groq API anahtarı ve Flask secret key
- Çalışan oturumu ve lead listesi
- Ziyaretçinin iletişim verileri
- Veritabanı bağlantı bilgisi

## Kontroller

| Risk | Kontrol | Kanıt |
|---|---|---|
| İstemcide anahtar sızıntısı | Anahtar yalnız Render ortamında ve AI servisinde okunur | `.env.example`, `ai_service.py` |
| SQL injection | SQLAlchemy Core bound parameters | `database.py`, injection testi |
| Yetkisiz lead erişimi | Rol kapsamlı, HttpOnly, SameSite session | `auth.py`, `/api/leads` testi |
| CSRF | Login/logout form tokenı ve constant-time karşılaştırma | `auth.py`, template, test |
| Clickjacking/XSS yüzeyi | `X-Frame-Options`, nonce tabanlı CSP, `nosniff` | `create_app()`, header testi |
| Aşırı büyük istek | 64 KiB request ve alan bazlı limitler | `config.py`, `validation.py`, 413 testi |
| Provider/DB ayrıntı sızıntısı | İstisna sınıfı loglanır; istemciye güvenli mesaj döner | `routes.py`, failure testleri |
| Gizli sayfaların indekslenmesi | Dashboard template'lerinde `noindex,nofollow` | templates |

## Oturum

- Oturum login sırasında tamamen yenilenir.
- Rol `employee` dışında panel erişimi yoktur.
- Üretim cookie'si `Secure`, `HttpOnly`, `SameSite=Lax` olarak ayarlanır.
- Süre sekiz saattir ve her istekte uzatılmaz.
- Hassas yanıtlar `no-store, private` taşır.

## Operasyon notu

`ASGARDIAN_EMPLOYEE_PASSWORD` yalnız Render secret ortam değişkeninde tutulur ve
kaynak koduna yazılmaz. Parola döndürme gerekiyorsa Render değeri değiştirilir;
uygulama yeniden yayımlandığında eski parola geçersiz olur.
