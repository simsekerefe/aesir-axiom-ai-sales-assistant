# Test Stratejisi

## Çalıştırma

```bash
python -m unittest discover -s tests -v
python scripts/architecture_audit.py
```

Testler geçici bir SQLite veritabanı ve Flask test client kullanır; gerçek Groq,
Render veya üretim PostgreSQL verisine yazmaz.

## Kapsam matrisi

| Alan | Otomatik kanıt |
|---|---|
| Health | DB türü, AI demo/aktif bilgisi ve request ID |
| Chat | JSON, mesaj, geçmiş, dil ve provider hata dönüşü |
| Lead | Kalıcılık, alan limitleri ve injection-benzeri veri |
| Yetki | Anonim dashboard redirect ve API 401 |
| Session/CSRF | Token zorunluluğu ve başarılı çalışan girişi |
| HTTP güvenliği | CSP nonce, frame koruması, 64 KiB 413 |
| SoC | SQL/AI çağrılarının doğru modülde kalması |

Canlı smoke testleri deploy sonrasında `/health`, `/api/sohbet`, çalışan login ve
test lead akışıyla ayrıca yürütülür.
