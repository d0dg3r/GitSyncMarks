# Firefox Add-ons (AMO) — GitSyncMarks (Türkçe)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefox yer imlerinizi GitHub ile senkronize edin — çift yönlü, çakışmasız. Dosya başına JSON, üç yönlü merge, otomatik sync. Yer İmleri Araç Çubuğu, Menü ve Mobil tam destek. Git, CLI veya GitHub Actions ile ekleyin. Açık kaynak, harici sunucu yok.

### Detailed Description
GitSyncMarks, Firefox yer imlerinizi bir GitHub deposuyla senkronize eder — çift yönlü, otomatik ve harici sunucu olmadan.

Özellikler:
• Dosya başına depolama: her yer imi ayrı bir JSON dosyası — okunabilir ve diff dostu
• Üç yönlü merge: her iki tarafta değişiklik olduğunda otomatik çakışmasız senkronizasyon
• Yer İmleri Menüsü klasörü dahil tam Firefox desteği
• Çoklu yer imi profili: ayrı GitHub depolarıyla en fazla 10 profil; geçiş yerel yer imlerini değiştirir
• GitHub Repos klasörü: tüm GitHub depolarınıza (genel ve özel) yer imleri içeren isteğe bağlı klasör
• Başlangıç: yeni profil yapılandırırken klasör oluşturma veya yer imlerini çekme
• Sync profilleri: gerçek zamanlı, sık, normal veya güç tasarrufu
• Her yer imi değişikliğinde otomatik sync (profil başına gecikme yapılandırılabilir)
• Başlatma / odaklanma ile Sync: tarayıcı başlatıldığında veya odaklandığında isteğe bağlı sync (bekleme süresiyle)
• Uzak değişiklikleri algılamak için periyodik Sync (1–120 dakika, yapılandırılabilir)
• Bildirimler: Tümü (başarılı + hata), Yalnızca hatalar veya Kapalı
• Popup üzerinden manuel Push, Pull ve tam Sync
• Otomatik merge mümkün olmadığında çakışma algılama
• Oluşturulan dosyalar: README.md (genel bakış), bookmarks.html (tarayıcı içe aktarma), feed.xml (RSS 2.0 akışı) ve dashy-conf.yml (Dashy panosu) — her biri Kapalı, Manuel veya Otomatik olarak yapılandırılabilir
• Ayarları Git ile Sync: depodaki uzantı ayarlarının şifreli yedeği — Global (paylaşılan) veya Bireysel (cihaz başına) modu; diğer cihazlardan ayarları içe aktarma; her cihazda aynı şifre, otomatik senkronize
• Seçenekler: 5 sekme (GitHub, Sync, Dosyalar, Yardım, Hakkında) ve GitHub ile Dosyalar için alt sekmeler — düzenli ayarlar arayüzü
• Bağlam menüsü: sayfa veya bağlantıya sağ tıklayın — Yer İşareti Çubuğuna Ekle, Diğer Yer İşaretlerine Ekle, Şimdi Senkronize Et, Favicon URL Kopyala, Favicon İndir
• Otomasyon: Git, CLI veya GitHub Actions ile yer imi ekleyin — tarayıcı açmadan
• İçe/Dışa Aktarma: yer imleri (JSON), Dashy yapılandırması (YAML) veya ayarlar (düz JSON / şifreli .enc); otomatik biçim algılamayla içe aktarma
• Otomatik kayıt: tüm ayarlar değiştirildiğinde otomatik kaydedilir — Kaydet düğmesi yok
• Tema: açık, koyu veya otomatik — döngü düğmesi (A → Koyu → Açık → A) seçeneklerde ve popup'ta
• Backlog oylaması: topluluk anketi ile sonraki özelliklerin önceliğini belirleyin
• Çok dilli: 12 dil — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manuel seçim veya otomatik algılama
• Klavye kısayolları: hızlı Sync (Ctrl+Shift+.), ayarları aç (Ctrl+Shift+,) — özelleştirilebilir
• Hata ayıklama günlüğü: Sync sekmesi — sync tanılaması için etkinleştirin, sorun giderme için dışa aktarın
• Mobil uygulama: GitSyncMarks-Mobile (iOS + Android) — yer imlerinizi hareket halinde görüntüleyin, deponuzdan salt okunur sync
• Harici sunucu yok — Personal Access Token'ınızı kullanarak doğrudan GitHub API ile iletişim kurar

Nasıl çalışır:
1. Yer imleriniz için bir GitHub deposu oluşturun
2. "repo" kapsamında bir Personal Access Token oluşturun
3. GitSyncMarks'ı token ve deponuzla yapılandırın
4. "Şimdi Senkronize Et"e tıklayın — tamam!

Her yer imi, deponuzda ayrı bir JSON dosyası olarak saklanır ve Firefox yer imi hiyerarşinizi (Yer İmleri Araç Çubuğu, Yer İmleri Menüsü, Diğer Yer İmleri) yansıtan klasörler halinde düzenlenir. README.md doğrudan GitHub'da genel bir bakış sunar; bookmarks.html herhangi bir tarayıcıya içe aktarmayı sağlar; feed.xml RSS akışı abonelik veya otomasyon için kullanılabilir; dashy-conf.yml Dashy panosu için bölümler sağlar.

Otomasyon:
Firefox'u açmadan yer imi ekleyebilirsiniz. GitSyncMarks, GitHub web arayüzü veya komut satırı üzerinden yer imi eklemenizi sağlayan bir GitHub Actions iş akışı (add-bookmark.yml) içerir:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Ayrıca depoda doğrudan yer imi dosyaları oluşturabilirsiniz — herhangi bir yer imi klasörüne "title" ve "url" içeren bir JSON dosyası ekleyin. Uzantı, sonraki senkronizasyonda yeni dosyaları otomatik olarak algılar.

GitSyncMarks tamamen açık kaynaktır: https://github.com/d0dg3r/GitSyncMarks

Mobil uygulama: GitSyncMarks-Mobile (iOS + Android) — yer imlerinizi hareket halinde görüntüleyin. Salt okunur yardımcı uygulama; F-Droid ve Google Play yakında. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Yer İmleri

### Tags
bookmarks, sync, github, backup, automation
