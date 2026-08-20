# Jüri Demo ve Sözlü Savunma Akışı

## Önerilen süre: 6–8 dakika

### 1. Problem ve çözüm — 40 saniye

“AESIR AXIOM için ziyaretçiyle yapay zekâ üzerinden iletişim kuran, talebi lead
olarak kaydeden ve çalışanın bu kayıtları güvenli panelden yönettiği yeniden
kullanılabilir bir sistem geliştirdim.”

### 2. Canlı frontend — 60 saniye

1. Ana sayfanın marka ve mühendislik dilini gösterin.
2. EN/TR geçişi yapın.
3. Mobil menüyü gösterin.
4. Animasyonların tasarım amacını bir cümleyle açıklayın.
5. Wix CMS'te bir içerik kaydını ve EN/TR eşini gösterin.

### 3. ASGARDIAN ve lead akışı — 90 saniye

1. Teknik bir soru sorun.
2. Yanıtın Groq modelinden geldiğini belirtin.
3. İletişim formundan test lead’i gönderin.
4. Çalışan paneline giriş yapıp aynı kaydı gösterin.

### 4. Mimari — 90 saniye

GitHub dosya ağacında şu sözleşmeyi anlatın:

- SQL/veri erişimi yalnız `database.py`.
- AI HTTP çağrısı yalnız `ai_service.py`.
- `routes.py` sadece doğrular ve servis çağırır.
- `create_app()` yapılandırma, CORS, DB ve Blueprint’leri birleştirir.
- Frontend, Render’a doğrudan değil Wix server proxy üzerinden bağlanır.

### 5. Güvenlik ve hata yönetimi — 60 saniye

- `.env` GitHub’da değildir.
- API anahtarı istemciye gönderilmez.
- Parametreli sorgu/SQLAlchemy bound parameter kullanılır.
- Çalışan paneli oturum, rol ve CSRF ile korunur.
- AI/DB kesintileri güvenli JSON ve kullanıcı mesajına dönüşür.

### 6. Canlı kanıt — 40 saniye

`/technical-dossier` sayfasında frontend, Wix CMS, backend ve veritabanı health
durumlarını; ardından değerlendirme kriteri–kanıt eşlemesini gösterin.

## Beklenen sorular

**Neden Astro kullandınız?**
İçerik ağırlıklı sayfalarda düşük JavaScript; etkileşimli alanlarda seçici React
hydration sağladığı için.

**Neden iki API katmanı var?**
Wix proxy’si istemci güvenliği ve sunum sınırıdır; Flask iş kurallarının ve AI/veri
servislerinin uygulandığı backend’dir.

**Groq değişirse ne olur?**
Yalnız `ai_service.py` ve model yapılandırması değişir; route ve frontend
sözleşmesi korunur.

**PostgreSQL ve SQLite neden birlikte?**
SQLite hızlı yerel geliştirme/test; PostgreSQL Render’da yeniden başlatmalar
arasında kalıcı üretim verisi sağlar.

**Wix’te neden görsel editör yok?**
Proje Wix Managed Headless’tır. Görsel tasarım kodla; içerik ise Wix CMS üzerinden
yönetilir. Bu ayrım tasarım bütünlüğünü korurken teknik kaynakları denetlenebilir
kılar.
