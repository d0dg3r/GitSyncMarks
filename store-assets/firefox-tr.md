# Firefox Add-ons (AMO) — GitSyncMarks (Türkçe)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Git deposuna yer imi senkronu. Linkwarden, Smart Search, Bitwarden yedek, rehberli sihirbaz. Çift yönlü, güvenli, özel. Tam Firefox desteği. Aracı yok.

### Detailed Description
GitSyncMarks yer imlerinizi kendi Git deponuzla çift yönlü senkronize eder — büyük barındırma platformları ve self-hosted Git sunucuları. Aracı yok, üçüncü taraf sunucu yok – verileriniz tamamen sizin kontrolünüzde.

Öne Çıkanlar

- Çoklu Sağlayıcı Git Senkronu: GitHub, GitLab veya self-hosted Git bağlayın — her profil kendi sağlayıcısını ve sunucu URL'sini kullanabilir.
- Profil Aktarımı ve Push Aynaları: Profiller arası yer imi kopyalama (değiştir veya birleştir); her senkron sonrası isteğe bağlı push-only yedek remote'lar.
- Canlı Senkron İlerlemesi: Push, pull ve profil değişiminde adım metni (örn. `3 / 12 dosya` veya `1 / 3` adım).
- Bitwarden / Vaultwarden Git Yedekleme: Parola korumalı vault dışa aktarmalarını depoda saklama, isteğe bağlı ek şifreleme; uzak yedekleri listeleme, indirme veya silme.
- Nested-card UI: Seçenekler, kurulum sihirbazı, popup ve aramada daha net gruplandırılmış bölümler.
- Senkron Geçmişi ve Geri Yükleme: Geçmiş commit'leri inceleme, diff önizlemesi ve tek tıkla önceki duruma dönme.
- Uzak Yetim Temizliği: Yerelde artık bulunmayan uzak yer imi dosyalarını önizleme ve silme.
- Linkwarden Sinerjisi: Sayfa veya bağlantıları Linkwarden örneğinize doğrudan kaydetme — viewport ekran görüntüleri, koleksiyon senkronu ve önceden tanımlı etiketler.
- Smart Search: Ayrılmış, yıldırım hızında yer imi arama, açık/koyu temalar ve tam klavye navigasyonu.
- Rehberli Kurulum Sihirbazı: Bağlantı testi yalnızca erişimi doğrular; pull, merge/sync, push, klasör kurulumu veya atlamayı seçersiniz — depoya yazmadan önce onay.
- Self-hosted Git Performansı: Uyumlu sunucularda hızlı git tree + blob okuma ve tek commit push (gerekirse Contents API yedek).
- Bağlam Menüsü: Hızlı klasörler, yer imi arama popup'ı, Klasörden Tümünü Aç, favicon kopyala/indir ve sağ tık profil işlemleri.
- Ayarları Git'e Senkron: Depodaki şifreli ayar yedeklemesi (`settings.enc`) — cihazlar arası yapılandırma paylaşımı.

Temel Yetenekler

- Gizlilik by design: Git sağlayıcı API'si ile doğrudan iletişim. Hiçbir üçüncü taraf verilerinizi görmez.
- Firefox için optimize: Yerel yapıları destekler (Araç çubuğu, Menü, Diğer).
- Üç yönlü birleştirme: Endüstriyel düzeyde senkron, birden fazla cihazdaki eşzamanlı değişiklikleri otomatik işler.
- Tek dosya depolama: Her yer imi okunabilir bir JSON dosyası – sürümleme ve manuel düzenleme için ideal.
- Çoklu profiller: İş, kişisel veya projeler için en fazla 10 ayrı profil, her biri kendi deposuyla.
- Otomasyon: CLI veya GitHub Actions ile yer imi ekleme; eklenti bir sonraki senkronda entegre eder.
- Oluşturulan dosyalar: README.md (genel bakış), bookmarks.html (içe aktarma), RSS beslemesi ve dashy-conf.yml — dosya başına isteğe bağlı.
- Tasarım ve i18n: Açık, koyu ve sistem otomatik temalar; ayarlanabilir UI yoğunluğu (kompakt / orta / büyük); 12 dil.

Companion App
GitSyncMarks-App (Android, iOS, Desktop) ile mobil cihazlarda Git deponuzdan yer imlerini doğrudan yönetin. (Not: Firefox for Android, eklentiler aracılığıyla doğrudan yer imi senkronunu desteklemez – uygulamayı kullanın.)

GitSyncMarks Açık Kaynak: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
yer imleri, sync, github, gitlab, yedek, otomasyon
