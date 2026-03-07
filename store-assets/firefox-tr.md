# Firefox Add-ons (AMO) — GitSyncMarks (Türkçe)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefox yer imlerinizi GitHub ile senkronize edin — çift yönlü, çakışmasız. Dosya başına JSON, üç yönlü merge, otomatik sync. Yer İmleri Araç Çubuğu, Menü ve Mobil tam destek. Git, CLI veya GitHub Actions ile ekleyin. Açık kaynak, aracısız.

### Detailed Description
GitSyncMarks, Firefox yer imlerinizi bir GitHub deposuyla senkronize eder — çift yönlü, otomatik ve aracısız.

Özellikler:
• Aracısız — Personal Access Token'ınızı kullanarak doğrudan GitHub API ile iletişim kurar
• Klavye kısayolları: hızlı Sync (Ctrl+Shift+.), ayarları aç (Ctrl+Shift+,) — özelleştirilebilir
• Hata ayıklama günlüğü: Sync sekmesi — sync tanılaması için etkinleştirin, sorun giderme için dışa aktarın
• Mobil uygulama: GitSyncMarks-App (iOS + Android) — yer imlerinizi hareket halinde görüntüleyin, deponuzdan salt okunur sync
• Otomatik kayıt: tüm ayarlar değiştirildiğinde otomatik kaydedilir — Kaydet düğmesi yok
• Bildirimler: Tümü (başarılı + hata), Yalnızca hatalar veya Kapalı

Nasıl çalışır:
1. Yer imleriniz için bir GitHub deposu oluşturun
2. klasik "repo" veya fine-grained "Contents: Read/Write" kapsamında bir Personal Access Token oluşturun
3. GitSyncMarks'ı token ve deponuzla yapılandırın
4. "Şimdi Senkronize Et"e tıklayın — tamam!

Her yer imi, deponuzda ayrı bir JSON dosyası olarak saklanır ve Firefox yer imi hiyerarşinizi (Yer İmleri Araç Çubuğu, Yer İmleri Menüsü, Diğer Yer İmleri) yansıtan klasörler halinde düzenlenir. README.md doğrudan GitHub'da genel bir bakış sunar; bookmarks.html herhangi bir tarayıcıya içe aktarmayı sağlar; feed.xml RSS akışı abonelik veya otomasyon için kullanılabilir; dashy-conf.yml Dashy panosu için bölümler sağlar.

Otomasyon:
Firefox'u açmadan yer imi ekleyebilirsiniz. GitSyncMarks, GitHub web arayüzü veya komut satırı üzerinden yer imi eklemenizi sağlayan bir GitHub Actions iş akışı (add-bookmark.yml) içerir:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Ayrıca depoda doğrudan yer imi dosyaları oluşturabilirsiniz — herhangi bir yer imi klasörüne "title" ve "url" içeren bir JSON dosyası ekleyin. Uzantı, sonraki senkronizasyonda yeni dosyaları otomatik olarak algılar.

GitSyncMarks tamamen açık kaynaktır: https://github.com/d0dg3r/GitSyncMarks

Mobil uygulama: GitSyncMarks-App (iOS + Android) — yer imlerinizi hareket halinde görüntüleyin. Salt okunur yardımcı uygulama; F-Droid ve Google Play yakında. https://github.com/d0dg3r/GitSyncMarks-App

### Categories
Yer İmleri

### Tags
bookmarks, sync, github, backup, automation
