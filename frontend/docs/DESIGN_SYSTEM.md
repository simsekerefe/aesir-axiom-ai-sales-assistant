# AESIR AXIOM Tasarım Sistemi

## Tasarım ilkesi

**Precision × Intelligence × Engineering × Motion × Architecture**

Arayüz; Nordik disiplin, çağdaş mühendislik ve kontrollü futurizmi birleştirir.
Neon, oyun arayüzü ve jenerik SaaS kart estetiği bilinçli olarak kullanılmaz.

## Renk tokenları

| Token | Değer | Rol |
|---|---:|---|
| Frosted Midnight | `#0F141D` | Ana zemin |
| Norse Blue | `#1E3A4D` | Yükseltilmiş yüzey |
| Glacier Steel | `#6E7D8A` | İkincil metin ve teknik işaret |
| Nordic Gold | `#D4AF37` | Kontrollü vurgu ve aktif durum |
| Ice White | `#F5F7FA` | Ana metin |

Renkler `src/styles/global.css` içindeki merkezi tokenlardan tüketilir.

## Tipografi

- **Marcellus:** marka, başlık ve editoryal hiyerarşi.
- **Inter:** gövde metni, form ve dijital arayüz.
- **Monospace:** koordinatlar, durum etiketleri ve sistem mikro metni.

## Geometri

- 1 px yapısal çizgiler.
- Düşük opaklıklı grid ve amblem filigranı.
- Keskin/az yuvarlatılmış mimari yüzeyler.
- Numaralandırılmış bölüm sistemi (`SYS / 001`, `01 / ...`).

## Hareket

- İlk yüklemede kısa amblem konstrüksiyonu.
- Sayfalar arasında tam ekran loader yerine ince ilerleme çizgisi.
- Scroll reveal ve düşük genlikli parallax.
- Hareket tercihini azaltan kullanıcılar için statik karşılık.

Her animasyon bir bilgi durumunu anlatır: yükleme, yön değişimi, hiyerarşi veya
odak. Rastlantısal dekoratif hareket kullanılmaz.
