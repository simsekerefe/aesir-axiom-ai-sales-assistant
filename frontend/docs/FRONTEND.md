# Frontend Teknik Açıklaması

## Neden Astro?

Kurumsal sayfalar ağırlıklı olarak içerik ve semantik HTML’den oluşur. Astro,
bu sayfaları düşük istemci JavaScript’iyle sunarken yalnızca etkileşim gereken
ASGARDIAN ve iletişim formunu React island olarak yükler.

## Sayfa katmanı

- `/`, `/about`, `/faq`, `/contact`, `/privacy`, `/terms`: İngilizce sayfalar.
- `/tr/*`: Türkçe karşılıklar.
- `/technical-dossier`: noindex teknik jüri görünümü.
- `/api/asgardian`: AI backend proxy.
- `/api/leads`: lead backend proxy.
- `/api/system-health`: yalnızca güvenli operasyon durumunu döndürür.
- `/api/content-health`: Wix CMS koleksiyon ve dil sayılarını güvenli biçimde doğrular.

## Bileşenler

- `Navigation.astro`: responsive navigasyon ve dil geçişi.
- `Footer.astro`: marka ve semantik site haritası.
- `AsgardianChat.tsx`: sohbet, öneriler, lead modalı ve hata durumları.
- `ContactForm.tsx`: Wix Forms + lead API koordinasyonu.
- `Layout.astro`: ortak metadata, loader, ClientRouter ve global kabuk.
- `LegalPage.astro`: Gizlilik ve Koşullar için yeniden kullanılan çift dilli şablon.

## İçerik yönetimi

- Editoryal metin, görsel ve SEO bilgileri Wix CMS'ten okunur.
- Kullanıcı arayüzü durum metinleri TypeScript içinde tip güvenli EN/TR
  sözlüklerinde tutulur.
- CMS kesintisinde her sayfanın onaylı varsayılan içeriği devreye girer.
- Sayfa geçişinden sonra mobil navigasyon yeniden bağlanır; parallax listener'ı
  `AbortController` ile tek örnek olarak korunur.

## Güvenlik ve dayanıklılık

- Gizli backend URL’si yalnızca sunucu ortam değişkeninden okunur.
- Mesaj, geçmiş, isim, telefon ve açıklama boyutları sınırlandırılır.
- Dış isteklerde `AbortController` timeout’u kullanılır.
- API yanıtları `no-store` ve `nosniff` başlıkları taşır.
- Kullanıcıya ham backend hatası veya istisna ayrıntısı gösterilmez.
- Wix hosting ters proxy davranışı nedeniyle Astro `checkOrigin` kapalıdır;
  güvenlik API girdi doğrulaması, same-origin proxy ve backend CORS politikasıyla
  katmanlı olarak sağlanır.

## Performans

- Fotoğrafların WebP sürümleri kullanılır.
- Görsellerde lazy loading ve decode ipuçları bulunur.
- React sadece gereken bileşenlerde hydrate edilir.
- Animasyonlar `transform`/`opacity` ağırlıklıdır.
- `prefers-reduced-motion` tüm hareket sistemini sadeleştirir.
