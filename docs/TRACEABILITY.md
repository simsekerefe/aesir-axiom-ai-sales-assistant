# Yönerge İzlenebilirlik Matrisi

| Değerlendirme | Uygulama | Sunum kanıtı |
|---|---|---|
| Mimari / SoC — %30 | Route, validation, AI, DB ve auth katmanları ayrıdır | `docs/ARCHITECTURE.md`, architecture audit |
| Çalışırlık — %25 | Chat → AI; form → lead; login → dashboard zinciri | Canlı smoke test + unittest |
| Kod kalitesi — %15 | Application factory, küçük işlevler, açık sabitler | Kod ağacı + test çıktısı |
| Güvenlik — %10 | Env secrets, bound parameter, session, CSRF, CSP, limitler | `docs/SECURITY.md`, testler |
| Hata yönetimi — %10 | AI/DB/validation/413 güvenli yanıtları | Failure-path testleri |
| Deploy / sunum — %10 | GitHub, Render blueprint, OpenAPI ve health | `render.yaml`, `openapi.yaml`, canlı URL |

Her satır hem kaynak dosyaya hem çalıştırılabilir veya canlı kanıta bağlanır;
sözlü savunmada “yapıldı” demek yerine aynı kanıt doğrudan gösterilebilir.
