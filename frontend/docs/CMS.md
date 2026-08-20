# Wix CMS İçerik Modeli

## Amaç

Tasarım ve uygulama kodu GitHub üzerinden denetlenebilir kalırken günlük içerik
değişiklikleri Wix Dashboard içindeki CMS alanından yapılır. Bu nedenle model,
sayfa şablonundan bağımsız dört koleksiyona ayrılmıştır.

## Koleksiyonlar

| Koleksiyon | Sorumluluk | Temel alanlar |
|---|---|---|
| `SiteSettings` | Marka kabuğu ve genel ayarlar | `locale`, `brandName`, `brandIdentifier`, `slogan`, `emblem`, `logo`, `active` |
| `PageSections` | Sayfa başlığı ve bölüm metin/görseli | `pageKey`, `sectionKey`, `locale`, `eyebrow`, `title`, `body`, `ctaLabel`, `image`, `sortOrder`, `active` |
| `ContentItems` | Tekrarlanan kart, ilke, soru ve metinler | `groupKey`, `locale`, `code`, `title`, `body`, `category`, `sortOrder`, `active` |
| `PageSEO` | Rota bazlı arama ve paylaşım metadatası | `route`, `locale`, `title`, `description`, `ogImage`, `noIndex` |

## Veri sözleşmesi

- `locale`: yalnız `en` veya `tr`.
- `pageKey`: içeriğin ait olduğu sayfa (`home`, `about`, `faq`, `contact`,
  `privacy`, `terms`).
- `sectionKey`: sayfadaki tekil yerleşim alanı (`hero`, `context`, `cta` gibi).
- `groupKey`: tekrar eden içerik dizisi (`capabilities`, `projects`, `faq` gibi).
- `sortOrder`: görünüm sırası; kod dosyasındaki sıra değiştirilmeden CMS'ten
  düzenlenir.
- `active`: kayıt silinmeden yayından çıkarılabilir.

## Güvenli geri dönüş

Her sayfada içerik kod içinde bulunan kurumsal bir varsayılanla birlikte
tanımlanır. Wix CMS geçici olarak erişilemezse boş veya kırık sayfa yerine bu
varsayılan içerik gösterilir. CMS kayıtları bulunduğunda aynı alanları ezerek
güncel içeriği sunar.

## Görsel yönetimi

Amblem, logo, hero, teknoloji ve araştırma görselleri Wix Media Manager'a
yüklenmiştir. CMS `IMAGE` alanları Wix medya kimliklerini taşır; frontend bu
değerleri responsive Wix CDN URL'lerine çözer. Yerel optimize WebP/PNG dosyaları
yalnız güvenli fallback olarak korunur.

## Jüri kanıtı

`/api/content-health`, yalnız koleksiyon/kayıt/dil sayılarını döndürür; içerik
veya gizli yapılandırma sızdırmaz. `/technical-dossier` bu endpoint'i canlı
çağırarak CMS katmanının çalıştığını gösterir.
